import { Request, Response, NextFunction } from 'express';
import catalogService from '../services/catalog.service';
import { CreateGlobalMedicineDto, UpdateGlobalMedicineDto, GlobalMedicineQueryDto } from '../types';

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

    async uploadCatalog(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new Error('No file uploaded');
            }

            const { supplierId, pharmaRepId } = req.body;
            if (!supplierId || !pharmaRepId) {
                throw new Error('supplierId and pharmaRepId are required');
            }

            const result = await catalogService.processCatalogCsv(req.file.buffer, supplierId, pharmaRepId);

            res.status(201).json({
                success: true,
                message: 'Catalog uploaded successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
    async sendPurchaseRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const { items } = req.body;
            // Pharmacy ID from auth user (tenant isolation)
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;

            if (!pharmacyId) throw new Error('Pharmacy ID not found in context');

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
