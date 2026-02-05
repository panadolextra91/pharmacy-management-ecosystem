import { Request, Response, NextFunction } from 'express';
import ownerManagementService from '../../application/owner-management.service';
import { OwnerStatus } from '@prisma/client';

/**
 * Owner Management Controller - System Admin Only (God Mode)
 */
class OwnerManagementController {
    /**
     * GET /admin/owners - List all Owners
     */
    async getAllOwners(req: Request, res: Response, next: NextFunction) {
        try {
            const status = req.query.status as OwnerStatus | undefined;
            const owners = await ownerManagementService.getAllOwners(status);
            res.json({
                success: true,
                data: owners,
                count: owners.length
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /admin/owners/:id - Get Owner details
     */
    async getOwnerById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const owner = await ownerManagementService.getOwnerById(id);
            res.json({ success: true, data: owner });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /admin/owners/:id/approve - Approve pending Owner
     */
    async approveOwner(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { subscriptionExpiry } = req.body;

            const expiryDate = subscriptionExpiry ? new Date(subscriptionExpiry) : undefined;
            const owner = await ownerManagementService.approveOwner(id, expiryDate);

            res.json({
                success: true,
                message: `Owner ${owner.email} has been approved`,
                data: owner
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /admin/owners/:id/suspend - Suspend Owner
     */
    async suspendOwner(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const owner = await ownerManagementService.suspendOwner(id, reason);

            res.json({
                success: true,
                message: `Owner ${owner.email} has been suspended`,
                data: owner
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /admin/owners/:id/reactivate - Reactivate suspended Owner
     */
    async reactivateOwner(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const owner = await ownerManagementService.reactivateOwner(id);

            res.json({
                success: true,
                message: `Owner ${owner.email} has been reactivated`,
                data: owner
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new OwnerManagementController();
