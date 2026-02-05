import { Router } from 'express';
import salesController from './sales.controller';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';

const router = Router();

// Routes
router.post('/orders', authenticate, requirePharmacyAccess, salesController.createOrder.bind(salesController));
router.get('/invoices/:id/receipt', authenticate, salesController.getReceipt.bind(salesController));
// router.get('/orders', authenticate, salesController.findAll.bind(salesController));
// router.get('/orders/:id', authenticate, salesController.findById.bind(salesController));

export default router;
