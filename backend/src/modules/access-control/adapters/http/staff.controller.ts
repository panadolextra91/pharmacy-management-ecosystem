import { Request, Response, NextFunction } from 'express';
import staffService from '../../application/staff.service';
import auditService from '../../../../shared/services/audit.service';
import { ActorType, AuditAction } from '@prisma/client';

class StaffController {
    async getAllStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const staffs = await staffService.getAllStaff(pharmacyId);
            res.status(200).json({ success: true, data: staffs });
        } catch (error) {
            next(error);
        }
    }

    async updateStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const updated = await staffService.updateStaff(id, pharmacyId, req.body);

            // LOG: Owner Updated Staff
            await auditService.log({
                req,
                pharmacyId,
                actorId: (req as any).user?.id,
                actorType: ActorType.OWNER,
                action: AuditAction.UPDATE,
                resource: 'PHARMACY_STAFF',
                resourceId: id,
                newData: req.body,
                metadata: { updatedStaffId: id }
            });

            res.status(200).json({ success: true, data: updated, message: 'Staff updated' });
        } catch (error) {
            next(error);
        }
    }

    async deleteStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            await staffService.deleteStaff(id, pharmacyId);

            // LOG: Owner Deleted Staff
            await auditService.log({
                req,
                pharmacyId,
                actorId: (req as any).user?.id,
                actorType: ActorType.OWNER,
                action: AuditAction.DELETE,
                resource: 'PHARMACY_STAFF',
                resourceId: id,
                metadata: { deletedStaffId: id }
            });
            res.status(200).json({ success: true, message: 'Staff deactivated' });
        } catch (error) {
            next(error);
        }
    }
}

export default new StaffController();
