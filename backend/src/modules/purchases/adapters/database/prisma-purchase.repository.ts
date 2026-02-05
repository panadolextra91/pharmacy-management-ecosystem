import prisma from '../../../../shared/config/database';
// RLS available via: import { createTenantPrisma } from '../../../../shared/prisma/client';

import { IPurchaseRepository } from '../../ports/purchase.repository.port';
import { PurchaseInvoiceEntity } from '../../domain/entities';
import { PurchaseQueryDto } from '../../application/dtos';

export class PrismaPurchaseRepository implements IPurchaseRepository {
    async create(data: any): Promise<PurchaseInvoiceEntity> {
        const { items, ...invoiceData } = data;
        return prisma.purchaseInvoice.create({
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
        const skip = (page - 1) * limit;

        const where: any = {
            pharmacyId,
            supplierId,
            status: status || undefined,
            invoiceDate: {
                gte: startDate ? new Date(startDate) : undefined,
                lte: endDate ? new Date(endDate) : undefined,
            },
        };

        const [total, data] = await Promise.all([
            prisma.purchaseInvoice.count({ where }),
            prisma.purchaseInvoice.findMany({
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
        // Note: PurchaseInvoice has pharmacyId but not in RLS extension yet.
        // Using manual filter for now. Can expand RLS later.
        return prisma.purchaseInvoice.findFirst({
            where: { id, pharmacyId },
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
