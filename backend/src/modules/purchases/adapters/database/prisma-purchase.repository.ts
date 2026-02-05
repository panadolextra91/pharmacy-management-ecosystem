import prisma from '../../../../shared/config/database';
import { createTenantPrisma } from '../../../../shared/prisma/client';

import { IPurchaseRepository } from '../../ports/purchase.repository.port';
import { PurchaseInvoiceEntity } from '../../domain/entities';
import { PurchaseQueryDto } from '../../application/dtos';

export class PrismaPurchaseRepository implements IPurchaseRepository {
    async create(data: any): Promise<PurchaseInvoiceEntity> {
        const { items, ...invoiceData } = data;
        const tenantPrisma = createTenantPrisma(invoiceData.pharmacyId);
        return tenantPrisma.purchaseInvoice.create({
            data: {
                ...invoiceData,
                items: {
                    create: items
                }
            },
            include: {
                items: { include: { inventory: true } },
                supplier: true
            }
        }) as unknown as PurchaseInvoiceEntity;
    }

    async findAll(query: PurchaseQueryDto): Promise<{ data: PurchaseInvoiceEntity[]; total: number }> {
        const { pharmacyId, page = 1, limit = 10, startDate, endDate, supplierId, status } = query;
        if (!pharmacyId) throw new Error('PharmacyId is required for findAll purchases');
        const tenantPrisma = createTenantPrisma(pharmacyId);
        const skip = (page - 1) * limit;

        const where: any = {
            supplierId,
            status: status || undefined,
            invoiceDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
        };

        const [total, data] = await Promise.all([
            tenantPrisma.purchaseInvoice.count({ where }),
            tenantPrisma.purchaseInvoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' },
                include: {
                    supplier: true,
                    items: { include: { inventory: true } } // Simplified count to actual items or check if count needed
                },
            }),
        ]);

        return { data: data as unknown as PurchaseInvoiceEntity[], total };
    }

    async findById(id: string, pharmacyId: string): Promise<PurchaseInvoiceEntity | null> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.purchaseInvoice.findFirst({
            where: { id },
            include: {
                items: { include: { inventory: true } },
                supplier: true,
            },
        }) as unknown as PurchaseInvoiceEntity;
    }

    async updateStatus(id: string, status: string, tx?: any): Promise<PurchaseInvoiceEntity> {
        const client = tx || prisma;
        return client.purchaseInvoice.update({
            where: { id },
            data: { status },
            include: { items: true } // Return items for iteration
        }) as unknown as PurchaseInvoiceEntity;
    }

    async executeTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
        return prisma.$transaction(async (tx) => {
            return callback(tx);
        });
    }
}
