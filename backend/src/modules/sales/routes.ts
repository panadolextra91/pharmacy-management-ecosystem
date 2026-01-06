import { Router } from 'express';
import salesController from './controllers/sales.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

// Protected routes (Staff/Owner)
router.post('/orders', authenticate, salesController.createOrder.bind(salesController));
router.get('/invoices/:id/receipt', authenticate, salesController.getReceipt.bind(salesController));
// router.get('/orders', authenticate, salesController.findAll.bind(salesController)); 
// router.get('/orders/:id', authenticate, salesController.findById.bind(salesController));

export default router;
