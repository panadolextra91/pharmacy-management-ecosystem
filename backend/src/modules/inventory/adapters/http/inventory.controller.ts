import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/express';
import inventoryService from '../../application/inventory.service';
import { CreateInventoryDto, UpdateInventoryDto, InventoryQueryDto } from '../../application/dtos';
import auditService from '../../../../shared/services/audit.service';
import { ActorType, AuditAction } from '@prisma/client';

class InventoryController {
    async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const data: CreateInventoryDto = {
                ...req.body,
                pharmacyId: req.pharmacyId!,
            };

            const result = await inventoryService.create(data);
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
            // Manual casting or validation needed for query params
            const query: InventoryQueryDto = {
                pharmacyId: req.pharmacyId!,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 20,
                search: req.query.search as string,
                categoryId: req.query.categoryId as string,
                storageLocationId: req.query.storageLocationId as string,
            };
            const result = await inventoryService.findAll(query);
            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await inventoryService.findById(id, req.pharmacyId!);
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
            const data: UpdateInventoryDto = req.body;
            const result = await inventoryService.update(id, req.pharmacyId!, data);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (quantity > 0) {
                throw new Error('Use POST /items/:id/stock to add positive stock with batch details');
            } else {

                const result = await inventoryService.deductStock(id, req.pharmacyId!, Math.abs(quantity));

                // LOG: Manual Stock Adjustment (Potential Theft/Loss)
                await auditService.log({
                    req,
                    pharmacyId: req.pharmacyId!,
                    actorId: (req as any).user?.id,
                    actorType: ActorType.STAFF, // Assuming mostly staff does this
                    action: AuditAction.UPDATE,
                    resource: 'INVENTORY_STOCK',
                    resourceId: id,
                    metadata: {
                        adjustment: quantity,
                        reason: 'Manual Adjustment',
                        isNegative: true
                    }
                });

                res.json({ success: true, data: result });
            }
        } catch (error) {
            next(error);
        }
    }

    async addStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = req.body;
            const result = await inventoryService.addStock(id, req.pharmacyId!, data);
            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    async getExpiryAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const days = req.query.days ? Number(req.query.days) : 30;
            const result = await inventoryService.getExpiryAlerts(req.pharmacyId!, days);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getLowStockAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const result = await inventoryService.getLowStockAlerts(req.pharmacyId!);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await inventoryService.delete(id, req.pharmacyId!);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new InventoryController();
