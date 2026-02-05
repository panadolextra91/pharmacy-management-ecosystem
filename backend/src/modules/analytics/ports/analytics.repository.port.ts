import { DashboardStats, InventoryValuation, ProfitLossReport, RevenueChartPoint, TopSellingItem } from '../domain/types';

export interface IAnalyticsRepository {
    getDashboardStats(pharmacyId: string): Promise<DashboardStats>;
    getRevenueChart(pharmacyId: string, startDate: Date, endDate: Date): Promise<RevenueChartPoint[]>;
    getProfitLoss(pharmacyId: string, startDate: Date, endDate: Date): Promise<ProfitLossReport>;
    getTopSelling(pharmacyId: string, limit: number): Promise<TopSellingItem[]>;
    getInventoryValuation(pharmacyId: string): Promise<InventoryValuation>;
}
