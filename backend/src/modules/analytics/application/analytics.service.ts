import dayjs from 'dayjs';
import { IAnalyticsRepository } from '../ports/analytics.repository.port';
import { DashboardStats, InventoryValuation, ProfitLossReport, RevenueChartPoint, TopSellingItem } from '../domain/types';

export class AnalyticsService {
    constructor(private repository: IAnalyticsRepository) { }

    async getDashboardStats(pharmacyId: string): Promise<DashboardStats> {
        return this.repository.getDashboardStats(pharmacyId);
    }

    async getRevenueChart(pharmacyId: string, days: number = 7): Promise<RevenueChartPoint[]> {
        const startDate = dayjs().subtract(days, 'day').startOf('day').toDate();
        const endDate = dayjs().endOf('day').toDate();

        return this.repository.getRevenueChart(pharmacyId, startDate, endDate);
    }

    async getProfitLoss(pharmacyId: string, startDate?: string, endDate?: string): Promise<ProfitLossReport> {
        const start = startDate ? dayjs(startDate).startOf('day').toDate() : dayjs().startOf('month').toDate();
        const end = endDate ? dayjs(endDate).endOf('day').toDate() : dayjs().endOf('month').toDate();

        return this.repository.getProfitLoss(pharmacyId, start, end);
    }

    async getTopSelling(pharmacyId: string, limit: number = 5): Promise<TopSellingItem[]> {
        return this.repository.getTopSelling(pharmacyId, limit);
    }

    async getInventoryValuation(pharmacyId: string): Promise<InventoryValuation> {
        return this.repository.getInventoryValuation(pharmacyId);
    }
}

// Export a factory/singleton for easy import, but standard requires explicit composition.
// We will export class and let controller instantiate or export singleton at end.
import { PrismaAnalyticsRepository } from '../adapters/database/prisma-analytics.repository';
import prisma from '../../../shared/config/database'; // Adjust path if needed
const analyticsRepository = new PrismaAnalyticsRepository(prisma);
export default new AnalyticsService(analyticsRepository);
