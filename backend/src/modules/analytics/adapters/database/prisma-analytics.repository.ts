import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { IAnalyticsRepository } from '../../ports/analytics.repository.port';
import { DashboardStats, InventoryValuation, ProfitLossReport, RevenueChartPoint, TopSellingItem } from '../../domain/types';

export class PrismaAnalyticsRepository implements IAnalyticsRepository {
    constructor(private prisma: PrismaClient) { }

    async getDashboardStats(pharmacyId: string): Promise<DashboardStats> {
        const startOfDay = dayjs().startOf('day').toDate();
        const endOfDay = dayjs().endOf('day').toDate();

        // 1. Today's Revenue & Orders
        const todayOrders = await this.prisma.pharmacyOrder.aggregate({
            where: {
                pharmacyId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { not: 'CANCELLED' }
            },
            _sum: { totalAmount: true },
            _count: { id: true }
        });

        // 2. Low Stock Items Count
        const lowStockCount = await this.prisma.pharmacyInventory.count({
            where: {
                pharmacyId,
                isActive: true,
                totalStockLevel: { lte: this.prisma.pharmacyInventory.fields.minStockLevel }
            }
        });

        // 3. Total Customers
        const totalCustomersGroup = await this.prisma.pharmacyOrder.groupBy({
            by: ['customerId'],
            where: { pharmacyId },
        });

        // 4. Low Stock Items List
        const lowStockItems = await this.prisma.pharmacyInventory.findMany({
            where: {
                pharmacyId,
                isActive: true,
                totalStockLevel: { lte: this.prisma.pharmacyInventory.fields.minStockLevel }
            },
            take: 5,
            select: { id: true, name: true, totalStockLevel: true, minStockLevel: true }
        });

        // 5. Expiring Batches
        const warningDate = dayjs().add(30, 'day').toDate();
        const expiringBatches = await this.prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId },
                stockQuantity: { gt: 0 },
                expiryDate: { lte: warningDate }
            },
            take: 5,
            include: { inventory: { select: { name: true } } },
            orderBy: { expiryDate: 'asc' }
        });

        return {
            todayRevenue: Number(todayOrders._sum.totalAmount || 0),
            todayOrders: todayOrders._count.id || 0,
            lowStockCount,
            totalCustomers: totalCustomersGroup.length,
            lowStockItems,
            expiringBatches: expiringBatches.map(b => ({
                id: b.id,
                name: b.inventory.name,
                batchCode: b.batchCode,
                expiryDate: b.expiryDate,
                stockQuantity: b.stockQuantity
            })),
            lastUpdated: new Date()
        };
    }

    async getRevenueChart(pharmacyId: string, startDate: Date, endDate: Date): Promise<RevenueChartPoint[]> {
        // Fetch raw orders and aggregate in code (simplified matching existing logic)
        const orders = await this.prisma.pharmacyOrder.findMany({
            where: {
                pharmacyId,
                createdAt: { gte: startDate, lte: endDate },
                status: { not: 'CANCELLED' }
            },
            select: { createdAt: true, totalAmount: true }
        });

        const chartData: Record<string, number> = {};

        // Helper to fill missing dates is better done in Service, 
        // but Repository can return the "Data Points" found.
        // We will return data found, and let service fill gaps if needed?
        // Actually, let's stick to returning what we found, service handles formatting if needed.
        // But for chart Consistency, let's do aggregation map here or in service.
        // The Interface expects RevenueChartPoint[].

        orders.forEach(order => {
            const dateStr = dayjs(order.createdAt).format('YYYY-MM-DD');
            chartData[dateStr] = (chartData[dateStr] || 0) + Number(order.totalAmount);
        });

        return Object.entries(chartData)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    async getProfitLoss(pharmacyId: string, startDate: Date, endDate: Date): Promise<ProfitLossReport> {
        const orders = await this.prisma.pharmacyOrder.findMany({
            where: {
                pharmacyId,
                status: { not: 'CANCELLED' },
                createdAt: { gte: startDate, lte: endDate }
            },
            include: {
                items: {
                    include: {
                        inventory: {
                            include: {
                                batches: true
                            }
                        }
                    }
                }
            }
        });

        let totalRevenue = 0;
        let totalCOGS = 0;

        for (const order of orders) {
            totalRevenue += Number(order.totalAmount);

            for (const item of order.items) {
                // WAC Calculation Logic
                const batches = item.inventory.batches.filter(b => b.stockQuantity > 0 || Number(b.purchasePrice) > 0);
                let avgCost = 0;

                if (batches.length > 0) {
                    const totalBatchValue = batches.reduce((sum, b) => sum + (Number(b.purchasePrice || 0) * b.stockQuantity), 0);
                    const totalBatchQty = batches.reduce((sum, b) => sum + b.stockQuantity, 0);
                    if (totalBatchQty > 0) {
                        avgCost = totalBatchValue / totalBatchQty;
                    }
                }

                if (avgCost === 0 && batches.length > 0) {
                    avgCost = Number(batches[0].purchasePrice || 0);
                }

                totalCOGS += (item.quantity * avgCost);
            }
        }

        return {
            startDate,
            endDate,
            revenue: totalRevenue,
            cogs: totalCOGS,
            grossProfit: totalRevenue - totalCOGS,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0
        };
    }

    async getTopSelling(pharmacyId: string, limit: number): Promise<TopSellingItem[]> {
        const topItems = await this.prisma.orderItem.groupBy({
            by: ['inventoryId'],
            where: {
                order: {
                    pharmacyId,
                    status: { not: 'CANCELLED' }
                }
            },
            _sum: { quantity: true },
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: limit
        });

        const results: TopSellingItem[] = [];
        for (const item of topItems) {
            const inventory = await this.prisma.pharmacyInventory.findUnique({
                where: { id: item.inventoryId },
                select: { name: true }
            });
            if (inventory) {
                results.push({
                    name: inventory.name,
                    quantitySold: item._sum.quantity || 0,
                });
            }
        }
        return results;
    }

    async getInventoryValuation(pharmacyId: string): Promise<InventoryValuation> {
        const batches = await this.prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId },
                stockQuantity: { gt: 0 }
            }
        });

        let totalCostValue = 0;
        for (const batch of batches) {
            totalCostValue += (Number(batch.purchasePrice || 0) * batch.stockQuantity);
        }

        return {
            totalAssetValue: totalCostValue,
            totalBatches: batches.length
        };
    }
}
