import prisma from '../../../shared/config/database';
import dayjs from 'dayjs';

class AnalyticsService {
    async getDashboardStats(pharmacyId: string) {
        const startOfDay = dayjs().startOf('day').toDate();
        const endOfDay = dayjs().endOf('day').toDate();

        // 1. Today's Revenue & Orders
        const todayOrders = await prisma.pharmacyOrder.aggregate({
            where: {
                pharmacyId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { not: 'CANCELLED' }
            },
            _sum: { totalAmount: true },
            _count: { id: true }
        });

        // 2. Low Stock Items
        const lowStockCount = await prisma.pharmacyInventory.count({
            where: {
                pharmacyId,
                isActive: true,
                totalStockLevel: { lte: prisma.pharmacyInventory.fields.minStockLevel }
            }
        });

        // 3. Total Customers (Shared but linked via Orders or specific list?) 
        // For now, count distinct customers who ordered from this pharmacy
        const totalCustomers = await prisma.pharmacyOrder.groupBy({
            by: ['customerId'],
            where: { pharmacyId },
        });

        // 4. Low Stock Items (Widget)
        const lowStockItems = await prisma.pharmacyInventory.findMany({
            where: {
                pharmacyId,
                isActive: true,
                totalStockLevel: { lte: prisma.pharmacyInventory.fields.minStockLevel }
            },
            take: 5,
            select: { id: true, name: true, totalStockLevel: true, minStockLevel: true }
        });

        // 5. Expiring Batches (Widget - next 30 days)
        const warningDate = dayjs().add(30, 'day').toDate();
        const expiringBatches = await prisma.inventoryBatch.findMany({
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
            todayRevenue: todayOrders._sum.totalAmount || 0,
            todayOrders: todayOrders._count.id || 0,
            lowStockCount,
            totalCustomers: totalCustomers.length,
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

    async getRevenueChart(pharmacyId: string, days: number = 7) {
        const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();

        // Aggregate by date from Orders table (Real-time approach for now)
        // Grouping by date in Prisma/SQL can be tricky without raw query.
        // Simplified approach: Fetch all orders in range and aggregate in JS (fine for MVP)

        const orders = await prisma.pharmacyOrder.findMany({
            where: {
                pharmacyId,
                createdAt: { gte: startDate },
                status: { not: 'CANCELLED' }
            },
            select: { createdAt: true, totalAmount: true }
        });

        const chartData: Record<string, number> = {};

        // Initialize all days with 0
        for (let i = 0; i < days; i++) {
            const dateStr = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
            chartData[dateStr] = 0;
        }

        orders.forEach(order => {
            const dateStr = dayjs(order.createdAt).format('YYYY-MM-DD');
            if (chartData[dateStr] !== undefined) {
                chartData[dateStr] += Number(order.totalAmount);
            }
        });

        // Convert to array sorted by date
        return Object.entries(chartData)
            .map(([date, value]) => ({ date, revenue: value }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // 4. Profit & Loss Report
    // NOTE: This uses Weighted Average Cost (WAC) logic since strict cost tracking per item isn't in schema yet.
    // Revenue = Sum of Order.totalAmount
    // COGS = Sum of (Item.quantity * Batch.purchasePrice) linked to sales
    async getProfitLoss(pharmacyId: string, startDate?: string, endDate?: string) {
        const start = startDate ? dayjs(startDate).startOf('day').toDate() : dayjs().startOf('month').toDate();
        const end = endDate ? dayjs(endDate).endOf('day').toDate() : dayjs().endOf('month').toDate();

        const orders = await prisma.pharmacyOrder.findMany({
            where: {
                pharmacyId,
                status: { not: 'CANCELLED' },
                createdAt: { gte: start, lte: end }
            },
            include: {
                items: {
                    include: {
                        inventory: {
                            include: {
                                batches: true // To find average cost
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

            // Calculate COGS per item
            for (const item of order.items) {
                // Determine Cost Price - Weighted Average of current batches
                // In a perfect system, OrderItem would have 'costPrice' snapshot.
                // Fallback: Use average purchase price of active batches.
                const batches = item.inventory.batches.filter(b => b.stockQuantity > 0 || Number(b.purchasePrice) > 0);

                let avgCost = 0;
                if (batches.length > 0) {
                    const totalBatchValue = batches.reduce((sum, b) => sum + (Number(b.purchasePrice || 0) * b.stockQuantity), 0);
                    const totalBatchQty = batches.reduce((sum, b) => sum + b.stockQuantity, 0);
                    avgCost = totalBatchQty > 0 ? totalBatchValue / totalBatchQty : 0;
                }

                // If avgCost is 0 (maybe no stock/cost info), try to find any purchase price
                if (avgCost === 0 && batches.length > 0) {
                    avgCost = Number(batches[0].purchasePrice || 0);
                }

                totalCOGS += (item.quantity * avgCost);
            }
        }

        return {
            startDate: start,
            endDate: end,
            revenue: totalRevenue,
            cogs: totalCOGS,
            grossProfit: totalRevenue - totalCOGS,
            margin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0
        };
    }

    // 5. Best Selling Products
    async getTopSelling(pharmacyId: string, limit: number = 5) {
        // Aggregation on OrderItems
        const topItems = await prisma.orderItem.groupBy({
            by: ['inventoryId'],
            where: {
                order: {
                    pharmacyId,
                    status: { not: 'CANCELLED' }
                }
            },
            _sum: {
                quantity: true,
                price: true // This is sum of (unit_price), not total revenue. Need careful calc.
            },
            orderBy: {
                _sum: { quantity: 'desc' }
            },
            take: limit
        });

        // Populate Names
        const results = [];
        for (const item of topItems) {
            const inventory = await prisma.pharmacyInventory.findUnique({
                where: { id: item.inventoryId },
                select: { name: true }
            });
            if (inventory) {
                results.push({
                    name: inventory.name,
                    quantitySold: item._sum.quantity || 0,
                    // Revenue approximation (accurate revenue requires summing price * quantity per row, assume price is per unit here)
                    // Actually OrderItem.price is unit price. 
                    // We can't sum Revenue easily with groupBy without raw query in some Prisma versions.
                    // For MVP, quantity is good enough.
                });
            }
        }
        return results;
    }

    // 6. Inventory Valuation
    async getInventoryValuation(pharmacyId: string) {
        const batches = await prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId },
                stockQuantity: { gt: 0 }
            }
        });

        let totalCostValue = 0; // Value at Purchase Price

        for (const batch of batches) {
            totalCostValue += (Number(batch.purchasePrice || 0) * batch.stockQuantity);
        }

        // Potential Revenue? Requires fetching current selling price of base unit.
        // Let's stick to Cost Value for "Assets" report.

        return {
            totalAssetValue: totalCostValue,
            totalBatches: batches.length
        };
    }
}

export default new AnalyticsService();
