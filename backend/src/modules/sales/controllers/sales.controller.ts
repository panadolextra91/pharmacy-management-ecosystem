import { Request, Response, NextFunction } from 'express';
import salesService from '../services/sales.service';
import { CreateOrderDto } from '../types';

class SalesController {
    async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const data: CreateOrderDto = req.body;
            // Tenant isolation
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;

            if (!pharmacyId) throw new Error('Pharmacy ID not found in context');

            const order = await salesService.createOrder({ ...data, pharmacyId });

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: order
            });
        } catch (error) {
            next(error);
        }
    }
    async getReceipt(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const receipt = await salesService.getReceipt(id, pharmacyId);
            res.status(200).json({
                success: true,
                data: receipt
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new SalesController();
