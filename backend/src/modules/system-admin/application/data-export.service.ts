import prisma from '../../../shared/config/database';
// import { AppError } from '../../../shared/middleware/error-handler.middleware';

export class DataExportService {
    /**
     * Export Global Customers (System Admin Only)
     */
    async exportGlobalCustomers() {
        const customers = await prisma.customer.findMany({
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                registrationSource: true,
                createdAt: true,
                // loyaltyPoints: true, // Field does not exist in schema
            },
            orderBy: { createdAt: 'desc' },
        });

        return this.toCsv(customers);
    }

    /**
     * Export Inventory (Tenant Scoped)
     */
    async exportInventory(pharmacyId: string) {
        // Enforce Tenant Check
        const items = await prisma.pharmacyInventory.findMany({
            where: { pharmacyId, isDeleted: false },
            include: {
                // Determine source of details: Global Catalog or Manual?
                // For now, selecting fields directly from PharmacyInventory or related GlobalCatalog
                globalCatalog: {
                    select: {
                        name: true,
                        manufacturer: true,
                    }
                },
                category: { select: { name: true } },
                brand: { select: { manufacturer: true } }
            },
            orderBy: { name: 'asc' }, // Order by local name
        });

        const data = items.map((item: any) => ({
            id: item.id,
            name: item.name || item.globalCatalog?.name,
            category: item.category?.name || 'N/A',
            stock: item.totalStockLevel,
            manufacturer: item.brand?.manufacturer || item.globalCatalog?.manufacturer || 'N/A',
            updatedAt: item.updatedAt.toISOString(),
        }));

        return this.toCsv(data);
    }

    /**
     * Export Sales (Tenant Scoped)
     */
    async exportSales(pharmacyId: string) {
        const orders = await prisma.pharmacyOrder.findMany({
            where: { pharmacyId },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                paymentStatus: true,
                paymentMethod: true,
                createdAt: true,
                customer: {
                    select: {
                        fullName: true,
                        phone: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 1000 // Limit for performance
        });

        const data = orders.map((order: any) => ({
            orderNumber: order.orderNumber,
            date: order.createdAt.toISOString(),
            status: order.status,
            customerName: order.customer?.fullName || 'Guest',
            customerPhone: order.customer?.phone || 'N/A',
            total: order.totalAmount,
            payment: order.paymentStatus,
            method: order.paymentMethod,
        }));

        return this.toCsv(data);
    }

    /**
     * Utility: JSON to CSV Converter
     */
    private toCsv(data: any[]): string {
        if (!data || data.length === 0) return '';

        const header = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
            Object.values(row)
                .map(val => `"${String(val).replace(/"/g, '""')}"`) // Escape quotes
                .join(',')
        );

        return [header, ...rows].join('\n');
    }
}

export default new DataExportService();
