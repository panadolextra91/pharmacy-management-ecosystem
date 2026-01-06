import { PrismaClient, Prisma } from '@prisma/client';
import { CreatePurchaseInvoiceDto, PurchaseQueryDto, UpdatePurchaseStatusDto } from '../types';
import { InventoryService } from '../../inventory/services/inventory.service';

export class PurchaseService {
    private prisma: PrismaClient;
    private inventoryService: InventoryService;

    constructor(prisma: PrismaClient, inventoryService: InventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }

    async createPurchase(pharmacyId: string, data: CreatePurchaseInvoiceDto) {
        let totalAmount = new Prisma.Decimal(0);
        const itemsCreateInput = data.items.map(item => {
            const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
            totalAmount = totalAmount.add(lineTotal);

            return {
                inventoryId: item.inventoryId,
                batchCode: item.batchCode,
                expiryDate: new Date(item.expiryDate),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: lineTotal,
            };
        });

        return this.prisma.purchaseInvoice.create({
            data: {
                pharmacyId,
                supplierId: data.supplierId,
                supplierName: data.supplierName,
                invoiceNumber: data.invoiceNumber,
                invoiceDate: new Date(data.invoiceDate),
                notes: data.notes,
                totalAmount,
                status: 'PENDING',
                items: {
                    create: itemsCreateInput,
                },
            },
            include: {
                items: {
                    include: {
                        inventory: true,
                    },
                },
                supplier: true,
            },
        });
    }

    async getPurchases(pharmacyId: string, query: PurchaseQueryDto) {
        const { page = 1, limit = 10, startDate, endDate, supplierId, status } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.PurchaseInvoiceWhereInput = {
            pharmacyId,
            supplierId,
            status: status || undefined,
            invoiceDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
        };

        const [total, data] = await Promise.all([
            this.prisma.purchaseInvoice.count({ where }),
            this.prisma.purchaseInvoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' },
                include: {
                    supplier: true,
                    _count: {
                        select: { items: true },
                    },
                },
            }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getPurchaseById(pharmacyId: string, id: string) {
        return this.prisma.purchaseInvoice.findFirstOrThrow({
            where: { id, pharmacyId },
            include: {
                items: {
                    include: {
                        inventory: true,
                    },
                },
                supplier: true,
            },
        });
    }

    async updateStatus(pharmacyId: string, id: string, data: UpdatePurchaseStatusDto) {
        const purchase = await this.prisma.purchaseInvoice.findFirstOrThrow({
            where: { id, pharmacyId },
            include: { items: true }
        });

        if (purchase.status !== 'PENDING') {
            throw new Error(`Cannot update status of a ${purchase.status} purchase`);
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Update purchase status
            const updatedPurchase = await tx.purchaseInvoice.update({
                where: { id },
                data: { status: data.status },
            });

            if (data.status === 'CONFIRMED') {
                // 2. Loop items and call inventoryService.addStock
                for (const item of purchase.items) {
                    await this.inventoryService.addStock(
                        item.inventoryId,
                        pharmacyId,
                        {
                            batchNumber: item.batchCode,
                            expiryDate: item.expiryDate.toISOString(),
                            quantity: item.quantity
                        },
                        tx
                    );
                }
            }

            return updatedPurchase;
        });
    }
}
