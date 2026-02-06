import prisma from '../../../../shared/config/database';
import { createTenantPrisma } from '../../../../shared/prisma/client';
import { IInventoryRepository } from '../../ports/inventory.repository.port';
import { CreateInventoryDto, InventoryQueryDto, UpdateInventoryDto } from '../../application/dtos';
import { InventoryEntity, InventoryBatchEntity } from '../../domain/inventory.entity';

export class PrismaInventoryRepository implements IInventoryRepository {
    async create(data: CreateInventoryDto): Promise<InventoryEntity> {
        return prisma.$transaction(async (tx) => {
            const inventory = await tx.pharmacyInventory.create({
                data: {
                    pharmacyId: data.pharmacyId,
                    globalCatalogId: data.globalCatalogId,
                    name: data.name,
                    description: data.description,
                    categoryId: data.categoryId,
                    brandId: data.brandId,
                    storageLocationId: data.storageLocationId,
                    image: data.image,
                    totalStockLevel: 0,
                    units: {
                        create: data.units.map((unit) => ({
                            name: unit.name,
                            conversionFactor: unit.conversionFactor,
                            price: unit.price,
                            isBaseUnit: unit.isBaseUnit || false,
                            isDefaultSelling: unit.isDefaultSelling || false,
                        })),
                    },
                },
                include: { units: true, batches: true },
            });
            return inventory as unknown as InventoryEntity;
        });
    }

    async findAll(query: InventoryQueryDto): Promise<{ data: InventoryEntity[]; pagination: any }> {
        const { pharmacyId, page = 1, limit = 20, search, categoryId, storageLocationId } = query;
        const tenantPrisma = createTenantPrisma(pharmacyId); // RLS Client
        const skip = (page - 1) * limit;
        const where: any = {}; // pharmacyId injected by client

        if (search) where.name = { contains: search, mode: 'insensitive' };
        if (categoryId) where.categoryId = categoryId;
        if (storageLocationId) where.storageLocationId = storageLocationId;

        const [total, data] = await Promise.all([
            tenantPrisma.pharmacyInventory.count({ where }),
            tenantPrisma.pharmacyInventory.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: true,
                    brand: true,
                    storageLocation: true,
                    units: true,
                    batches: {
                        where: { stockQuantity: { gt: 0 } },
                        orderBy: { expiryDate: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        return {
            data: data as unknown as InventoryEntity[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string, pharmacyId: string): Promise<InventoryEntity | null> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        // Use findFirst to allow RLS injection (cannot use findUnique with extra args)
        const inventory = await tenantPrisma.pharmacyInventory.findFirst({
            where: { id },
            include: {
                category: true,
                brand: true,
                storageLocation: true,
                units: true,
                batches: { orderBy: { expiryDate: 'asc' } },
            },
        });

        if (!inventory) return null;
        return inventory as unknown as InventoryEntity;
    }

    async update(id: string, pharmacyId: string, data: UpdateInventoryDto): Promise<InventoryEntity> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        const inventory = await tenantPrisma.pharmacyInventory.update({
            where: { id },
            data,
            include: { units: true },
        });
        return inventory as unknown as InventoryEntity;
    }

    async delete(id: string, pharmacyId: string): Promise<void> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        // Soft delete instead of hard delete
        await tenantPrisma.pharmacyInventory.update({
            where: { id },
            data: { isDeleted: true }
        });
        // Soft delete associated batches
        await tenantPrisma.inventoryBatch.updateMany({
            where: { inventoryId: id },
            data: { isDeleted: true }
        });
    }

    async deductStock(inventoryId: string, _pharmacyId: string, quantity: number, tx?: any): Promise<InventoryEntity> {
        const execute = async (client: any) => {
            // 1. ATOMIC GUARD: Decrement Total Stock first to reserve quantity
            // This prevents Race Conditions. If 2 requests try to sell last item, one will fail here.
            // We use updateMany to avoid erroring if not found, allowing us to throw custom error.
            const result = await client.pharmacyInventory.updateMany({
                where: {
                    id: inventoryId,
                    totalStockLevel: { gte: quantity } // Constraint: Must have enough stock
                },
                data: {
                    totalStockLevel: { decrement: quantity }
                }
            });

            if (result.count === 0) {
                // If count is 0, it means either ID is wrong OR (more likely) stock < quantity
                // We double check to throw correct error
                const current = await client.pharmacyInventory.findUnique({ where: { id: inventoryId } });
                if (!current) throw new Error('Inventory verified but not found during update (Unreachable)');

                throw new Error(`Insufficient stock for ${current.name}. Available: ${current.totalStockLevel}, Requested: ${quantity}`);
            }

            // 2. FIFO BATCH DEDUCTION
            let remainingToDeduct = quantity;

            const batches = await client.inventoryBatch.findMany({
                where: {
                    inventoryId,
                    stockQuantity: { gt: 0 },
                    isDeleted: false,
                    expiryDate: { gt: new Date() } // FIX: INV-H1 - Ignore expired batches
                },
                orderBy: { expiryDate: 'asc' }
            });

            for (const batch of batches) {
                if (remainingToDeduct <= 0) break;
                const deductAmount = Math.min(batch.stockQuantity, remainingToDeduct);

                await client.inventoryBatch.update({
                    where: { id: batch.id },
                    data: { stockQuantity: { decrement: deductAmount } }
                });
                remainingToDeduct -= deductAmount;
            }

            // 3. Cleanup: If we deducted from Total but somehow Batches didn't sum up (Data drift)
            // The Inventory Reconciliation Worker will fix it later. 
            // But we prioritize Total Stock accuracy for Sales.

            // Return updated header
            const updatedInventory = await client.pharmacyInventory.findUnique({
                where: { id: inventoryId },
                include: { units: true } // Return with units as expected
            });

            return updatedInventory as unknown as InventoryEntity;
        };

        if (tx) {
            return execute(tx);
        } else {
            return prisma.$transaction(execute);
        }
    }

    // --- Batch Methods ---

    /**
     * Get the cost price from the oldest (FIFO) batch with stock.
     * Returns 0 if no batches found.
     */
    async getOldestBatchCost(inventoryId: string): Promise<number> {
        const batch = await prisma.inventoryBatch.findFirst({
            where: { inventoryId, stockQuantity: { gt: 0 }, isDeleted: false },
            orderBy: { expiryDate: 'asc' },
            select: { purchasePrice: true }
        });
        return batch?.purchasePrice ? Number(batch.purchasePrice) : 0;
    }

    async findBatch(inventoryId: string, batchCode: string, tx?: any): Promise<InventoryBatchEntity | null> {
        const client = tx || prisma;
        const batch = await client.inventoryBatch.findFirst({
            where: { inventoryId, batchCode },
        });
        return batch as unknown as InventoryBatchEntity;
    }

    async createBatch(data: { inventoryId: string; batchCode: string; expiryDate: Date; stockQuantity: number }, tx?: any): Promise<InventoryBatchEntity> {
        const client = tx || prisma;
        const batch = await client.inventoryBatch.create({
            data: {
                inventoryId: data.inventoryId,
                batchCode: data.batchCode,
                expiryDate: data.expiryDate,
                stockQuantity: data.stockQuantity,
            },
        });
        return batch as unknown as InventoryBatchEntity;
    }

    async updateBatchStock(batchId: string, quantityIncrement: number, tx?: any): Promise<InventoryBatchEntity> {
        const client = tx || prisma;
        const batch = await client.inventoryBatch.update({
            where: { id: batchId },
            data: { stockQuantity: { increment: quantityIncrement } },
        });
        return batch as unknown as InventoryBatchEntity;
    }

    async updateTotalStock(inventoryId: string, quantityIncrement: number, tx?: any): Promise<InventoryEntity> {
        const client = tx || prisma;
        const inventory = await client.pharmacyInventory.update({
            where: { id: inventoryId },
            data: { totalStockLevel: { increment: quantityIncrement } },
        });
        return inventory as unknown as InventoryEntity;
    }

    // Advanced Alerts
    async getExpiryAlerts(pharmacyId: string, dateThreshold: Date): Promise<InventoryBatchEntity[]> {
        const batches = await prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId },
                stockQuantity: { gt: 0 },
                expiryDate: { lte: dateThreshold },
            },
            include: {
                inventory: { include: { storageLocation: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });
        return batches as unknown as InventoryBatchEntity[];
    }

    async getLowStockAlerts(pharmacyId: string): Promise<any[]> {
        return prisma.$queryRaw`
            SELECT * FROM "pharmacy_inventory"
            WHERE "pharmacy_id" = ${pharmacyId}
            AND "total_stock_level" <= "min_stock_level"
            ORDER BY "total_stock_level" ASC
        `;
    }
}
