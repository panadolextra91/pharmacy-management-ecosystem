import { Request, Response, NextFunction } from 'express';
import analyticsService, { AnalyticsService } from '../../application/analytics.service';
import { AppError } from '../../../../shared/middleware/error-handler.middleware';

class AnalyticsController {
    constructor(private service: AnalyticsService = analyticsService) { }

    getDashboard = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            if (!pharmacyId) throw new AppError('Pharmacy Context Required', 400, 'BAD_REQUEST');

            const stats = await this.service.getDashboardStats(pharmacyId);
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    };

    getRevenueChart = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const days = Number(req.query.days) || 7;

            const chart = await this.service.getRevenueChart(pharmacyId, days);
            res.status(200).json({ success: true, data: chart });
        } catch (error) {
            next(error);
        }
    };

    getProfitLoss = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const { startDate, endDate } = req.query as any;
            const report = await this.service.getProfitLoss(pharmacyId, startDate, endDate);
            res.status(200).json({ success: true, data: report });
        } catch (error) {
            next(error);
        }
    };

    getTopSelling = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const limit = Number(req.query.limit) || 5;
            const data = await this.service.getTopSelling(pharmacyId, limit);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    };

    getInventoryValuation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const data = await this.service.getInventoryValuation(pharmacyId);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    };
}

export default new AnalyticsController();
