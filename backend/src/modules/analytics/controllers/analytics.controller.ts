import { Request, Response, NextFunction } from 'express';
import analyticsService from '../services/analytics.service';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class AnalyticsController {
    async getDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            if (!pharmacyId) throw new AppError('Pharmacy Context Required', 400, 'BAD_REQUEST');

            const stats = await analyticsService.getDashboardStats(pharmacyId);
            res.status(200).json({ success: true, data: stats });
        } catch (error) {
            next(error);
        }
    }

    async getRevenueChart(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const days = Number(req.query.days) || 7;

            const chart = await analyticsService.getRevenueChart(pharmacyId, days);
            res.status(200).json({ success: true, data: chart });
        } catch (error) {
            next(error);
        }
    }

    async getProfitLoss(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const { startDate, endDate } = req.query as any;
            const report = await analyticsService.getProfitLoss(pharmacyId, startDate, endDate);
            res.status(200).json({ success: true, data: report });
        } catch (error) {
            next(error);
        }
    }

    async getTopSelling(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const limit = Number(req.query.limit) || 5;
            const data = await analyticsService.getTopSelling(pharmacyId, limit);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    async getInventoryValuation(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const data = await analyticsService.getInventoryValuation(pharmacyId);
            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
}

export default new AnalyticsController();
