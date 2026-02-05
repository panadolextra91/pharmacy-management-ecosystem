
export interface DashboardStats {
    todayRevenue: number;
    todayOrders: number;
    lowStockCount: number;
    totalCustomers: number;
    lowStockItems: Array<{ id: string; name: string; totalStockLevel: number; minStockLevel: number }>;
    expiringBatches: Array<{ id: string; name: string; batchCode: string; expiryDate: Date; stockQuantity: number }>;
    lastUpdated: Date;
}

export interface RevenueChartPoint {
    date: string;
    revenue: number;
}

export interface ProfitLossReport {
    startDate: Date;
    endDate: Date;
    revenue: number;
    cogs: number; // Cost of Goods Sold
    grossProfit: number;
    margin: number;
}

export interface TopSellingItem {
    name: string;
    quantitySold: number;
}

export interface InventoryValuation {
    totalAssetValue: number;
    totalBatches: number;
}
