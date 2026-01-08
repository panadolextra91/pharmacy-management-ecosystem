import { Router } from 'express';
import analyticsController from './controllers/analytics.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../shared/middleware/tenant.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import { dateRangeSchema, topSellingSchema } from './validators';


const router = Router();

// Dashboard Stats
router.get('/dashboard', authenticate, requirePharmacyAccess, analyticsController.getDashboard.bind(analyticsController));

// Charts
router.get('/revenue-chart', authenticate, requirePharmacyAccess, analyticsController.getRevenueChart.bind(analyticsController));

// Advanced Reports
router.get('/profit-loss', authenticate, requirePharmacyAccess, validate(dateRangeSchema), analyticsController.getProfitLoss.bind(analyticsController));
router.get('/top-selling', authenticate, requirePharmacyAccess, validate(topSellingSchema), analyticsController.getTopSelling.bind(analyticsController));
router.get('/inventory-valuation', authenticate, requirePharmacyAccess, analyticsController.getInventoryValuation.bind(analyticsController));

export default router;
