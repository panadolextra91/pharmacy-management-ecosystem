import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../shared/types/express';
import storageLocationService from '../services/storage-location.service';
import { CreateStorageLocationDto, UpdateStorageLocationDto } from '../types';

class StorageLocationController {
    async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const data: CreateStorageLocationDto = {
                ...req.body,
                pharmacyId: req.pharmacyId!, // Enforced by RequirePharmacyAccess middleware
            };

            const result = await storageLocationService.create(data);
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const result = await storageLocationService.findAll(req.pharmacyId!);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await storageLocationService.findById(id, req.pharmacyId!);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data: UpdateStorageLocationDto = req.body;
            const result = await storageLocationService.update(id, req.pharmacyId!, data);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await storageLocationService.delete(id, req.pharmacyId!);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new StorageLocationController();
