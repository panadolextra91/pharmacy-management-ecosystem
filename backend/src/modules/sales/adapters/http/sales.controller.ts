import { Request, Response, NextFunction } from 'express';
import salesService, { SalesService } from '../../application/sales.service';
import { CreateOrderDto } from '../../application/dtos';

class SalesController {
    private salesService: SalesService;

    constructor(service: SalesService = salesService) {
        this.salesService = service;
    }
    createOrder = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data: CreateOrderDto = req.body;
            // Tenant isolation
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;

            if (!pharmacyId) throw new Error('Pharmacy ID not found in context');

            const order = await this.salesService.createOrder({ ...data, pharmacyId });

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: order
            });
        } catch (error) {
            next(error);
        }
    }
    getReceipt = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const receipt = await this.salesService.getReceipt(id, pharmacyId);
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
