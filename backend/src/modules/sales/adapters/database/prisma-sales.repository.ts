import prisma from '../../../../shared/config/database';
import { createTenantPrisma } from '../../../../shared/prisma/client';
import { ISalesRepository } from '../../ports/sales.repository.port';
import { PharmacyOrderEntity, PharmacyInvoiceEntity } from '../../domain/entities';

export class PrismaSalesRepository implements ISalesRepository {
    async createOrder(data: any, tx?: any): Promise<PharmacyOrderEntity> {
        const client = tx || prisma;
        const { items, ...orderData } = data;
        return client.pharmacyOrder.create({
            data: {
                ...orderData,
                items: {
                    create: items
                }
            },
            include: { items: true }
        }) as unknown as PharmacyOrderEntity;
    }

    async createInvoice(data: any, tx?: any): Promise<PharmacyInvoiceEntity> {
        const client = tx || prisma;
        const { items, ...invoiceData } = data;
        return client.pharmacyInvoice.create({
            data: {
                ...invoiceData,
                items: {
                    create: items
                }
            }
        }) as unknown as PharmacyInvoiceEntity;
    }

    async findOrderById(id: string, pharmacyId: string): Promise<PharmacyOrderEntity | null> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.pharmacyOrder.findFirst({
            where: { id },
            include: { items: true }
        }) as unknown as PharmacyOrderEntity;
    }

    async findInvoiceById(id: string, pharmacyId: string): Promise<PharmacyInvoiceEntity | null> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.pharmacyInvoice.findFirst({
            where: { id },
            include: {
                pharmacy: true,
                items: {
                    include: { inventory: { include: { units: true } } }
                }
            }
        }) as unknown as PharmacyInvoiceEntity;
    }

    async executeTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
        return prisma.$transaction(async (tx) => {
            return callback(tx);
        });
    }
}
