import { Router } from 'express';
import analyticsController from './analytics.controller';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';

const router = Router();

// Routes
router.use(authenticate, requirePharmacyAccess);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/revenue', analyticsController.getRevenueChart);
router.get('/profit-loss', analyticsController.getProfitLoss);
router.get('/top-selling', analyticsController.getTopSelling);
router.get('/inventory-valuation', analyticsController.getInventoryValuation);

export default router;
