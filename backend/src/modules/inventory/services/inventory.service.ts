import prisma from '../../../shared/config/database';
import { Prisma } from '@prisma/client';
import { CreateInventoryDto, UpdateInventoryDto, InventoryQueryDto } from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

export class InventoryService {
    async create(data: CreateInventoryDto) {
        // 1. Validate units
        const baseUnits = data.units.filter((u) => u.isBaseUnit);
        if (baseUnits.length !== 1) {
            throw new AppError('Inventory must have exactly one base unit', 400, 'INVALID_UNITS');
        }

        // 2. Prepare database transaction
        return prisma.$transaction(async (tx) => {
            // 3. Create inventory item
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
                    totalStockLevel: 0, // Initial stock is 0, added via batches later
                },
            });

            // 4. Create units
            await tx.inventoryUnit.createMany({
                data: data.units.map((unit) => ({
                    inventoryId: inventory.id,
                    name: unit.name,
                    conversionFactor: unit.conversionFactor,
                    price: unit.price,
                    isBaseUnit: unit.isBaseUnit || false,
                    isDefaultSelling: unit.isDefaultSelling || false,
                })),
            });

            return inventory;
        });
    }

    async findAll(query: InventoryQueryDto) {
        const { pharmacyId, page = 1, limit = 20, search, categoryId, storageLocationId } = query;
        const skip = (page - 1) * limit;

        const where: any = { pharmacyId };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        if (categoryId) where.categoryId = categoryId;
        if (storageLocationId) where.storageLocationId = storageLocationId;

        const [total, data] = await Promise.all([
            prisma.pharmacyInventory.count({ where }),
            prisma.pharmacyInventory.findMany({
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
                        orderBy: { expiryDate: 'asc' }, // FIFO
                    },
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string, pharmacyId: string, tx?: Prisma.TransactionClient) {
        const client = tx || prisma;
        const inventory = await client.pharmacyInventory.findUnique({
            where: { id },
            include: {
                category: true,
                brand: true,
                storageLocation: true,
                units: true,
                batches: {
                    orderBy: { expiryDate: 'asc' },
                },
            },
        });

        if (!inventory || inventory.pharmacyId !== pharmacyId) {
            throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
        }

        return inventory;
    }

    async update(id: string, pharmacyId: string, data: UpdateInventoryDto) {
        await this.findById(id, pharmacyId);

        return prisma.pharmacyInventory.update({
            where: { id },
            data,
            include: { units: true },
        });
    }

    async addStock(inventoryId: string, pharmacyId: string, data: { batchNumber: string; expiryDate: string; quantity: number }, tx?: Prisma.TransactionClient) {
        // 1. Verify existence and ownership (pass tx)
        await this.findById(inventoryId, pharmacyId, tx);

        const runTransaction = async (client: Prisma.TransactionClient) => {
            // 2. Check if batch exists or create new
            let batch = await client.inventoryBatch.findFirst({
                where: {
                    inventoryId,
                    batchCode: data.batchNumber,
                },
            });

            if (batch) {
                // Update existing batch
                batch = await client.inventoryBatch.update({
                    where: { id: batch.id },
                    data: {
                        stockQuantity: { increment: data.quantity },
                    },
                });
            } else {
                // Create new batch
                batch = await client.inventoryBatch.create({
                    data: {
                        inventoryId,
                        batchCode: data.batchNumber,
                        expiryDate: new Date(data.expiryDate),
                        stockQuantity: data.quantity,
                    },
                });
            }

            // 3. Update total stock
            const updatedInventory = await client.pharmacyInventory.update({
                where: { id: inventoryId },
                data: {
                    totalStockLevel: { increment: data.quantity },
                },
            });

            return { batch, totalStockLevel: updatedInventory.totalStockLevel };
        };

        if (tx) return runTransaction(tx);
        return prisma.$transaction(runTransaction);
    }

    async deductStock(inventoryId: string, pharmacyId: string, quantity: number) {
        const inventory = await this.findById(inventoryId, pharmacyId);

        if (inventory.totalStockLevel < quantity) {
            throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');
        }

        const result = await prisma.$transaction(async (tx) => {
            let remainingToDeduct = quantity;

            // FIFO: Get batches with stock, ordered by expiry
            const batches = await tx.inventoryBatch.findMany({
                where: {
                    inventoryId,
                    stockQuantity: { gt: 0 }
                },
                orderBy: { expiryDate: 'asc' }
            });

            for (const batch of batches) {
                if (remainingToDeduct <= 0) break;

                const deductAmount = Math.min(batch.stockQuantity, remainingToDeduct);

                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: { stockQuantity: { decrement: deductAmount } }
                });

                remainingToDeduct -= deductAmount;
            }

            // Update total inventory stock
            const updatedInventory = await tx.pharmacyInventory.update({
                where: { id: inventoryId },
                data: { totalStockLevel: { decrement: quantity } }
            });

            return updatedInventory;
        });

        // Trigger Low Stock Alert
        if (result.totalStockLevel <= result.minStockLevel) {
            import('../../notifications/services/staff-notification.service').then(service => {
                service.default.notifyPharmacy(
                    pharmacyId,
                    'INVENTORY_LOW_STOCK',
                    'Low Stock Alert',
                    `Item '${inventory.name}' is low on stock (${result.totalStockLevel} left).`,
                    { inventoryId: result.id, currentStock: result.totalStockLevel }
                );
            }).catch(err => console.error('Failed to send notification', err));
        }

        return { totalStockLevel: result.totalStockLevel };
    }

    async getExpiryAlerts(pharmacyId: string, days: number = 30) {
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + days);

        return prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId },
                stockQuantity: { gt: 0 },
                expiryDate: { lte: warningDate },
            },
            include: {
                inventory: {
                    include: {
                        storageLocation: true,
                    }
                }
            },
            orderBy: { expiryDate: 'asc' },
        });
    }

    async getLowStockAlerts(pharmacyId: string) {
        // Raw query to find items where totalStockLevel <= minStockLevel
        // Note: Prisma Raw Query returns simple objects, relations (like units) won't be auto-fetched unless joined manually.
        // For alerts, basic info is usually enough.

        return prisma.$queryRaw`
            SELECT * FROM "pharmacy_inventory"
            WHERE "pharmacy_id" = ${pharmacyId}
            AND "total_stock_level" <= "min_stock_level"
            ORDER BY "total_stock_level" ASC
        `;
    }

    async delete(id: string, pharmacyId: string) {
        const inventory = await this.findById(id, pharmacyId);

        // Check if any stock exists
        if (inventory.totalStockLevel > 0) {
            throw new AppError('Cannot delete inventory with remaining stock', 400, 'INVALID_OPERATION');
        }

        await prisma.pharmacyInventory.delete({ where: { id } });
        return { message: 'Inventory item deleted successfully' };
    }
}

export default new InventoryService();
