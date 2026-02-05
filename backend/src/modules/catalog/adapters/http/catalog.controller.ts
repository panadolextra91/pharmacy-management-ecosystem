import { Request, Response, NextFunction } from 'express';
import catalogService from '../../application/catalog.service';
import authService from '../../../access-control/application/auth.service';
import { CreateGlobalMedicineDto, UpdateGlobalMedicineDto, GlobalMedicineQueryDto } from '../../application/dtos';
import { AppError } from '../../../../shared/middleware/error-handler.middleware';

class CatalogController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data: CreateGlobalMedicineDto = req.body;
            const result = await catalogService.create(data);
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const query: GlobalMedicineQueryDto = req.query;
            const result = await catalogService.findAll(query);
            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await catalogService.findById(id);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data: UpdateGlobalMedicineDto = req.body;
            const result = await catalogService.update(id, data);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await catalogService.delete(id);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async requestCatalogOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            if (!email) throw new AppError('Email is required', 400, 'BAD_REQUEST');

            await authService.requestPharmaRepOtp(email);

            res.status(200).json({
                success: true,
                message: 'OTP sent to your email'
            });
        } catch (error) {
            next(error);
        }
    }

    async uploadCatalog(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, supplierId } = req.body;
            if (!email || !otp || !supplierId) {
                throw new AppError('email, otp, and supplierId are required', 400, 'BAD_REQUEST');
            }

            if (!req.file) {
                throw new AppError('No CSV file uploaded', 400, 'BAD_REQUEST');
            }

            // Verify OTP and get Rep ID
            const pharmaRepId = await authService.verifyPharmaRepToken(email, otp);

            const result = await catalogService.processCatalogCsv(req.file.buffer, supplierId, pharmaRepId);

            res.status(201).json({
                success: true,
                message: 'Catalog uploaded and pending approval',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async getPendingItems(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await catalogService.getPendingItems();
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async approveCatalogItems(req: Request, res: Response, next: NextFunction) {
        try {
            const { ids } = req.body;
            const result = await catalogService.approveCatalogItems(ids);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    async sendPurchaseRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const { items } = req.body;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;

            if (!pharmacyId) throw new AppError('Pharmacy ID not found', 403, 'FORBIDDEN');

            const result = await catalogService.sendPurchaseRequest({ pharmacyId, items });

            res.status(200).json({
                success: true,
                message: 'Purchase requests sent successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CatalogController();
