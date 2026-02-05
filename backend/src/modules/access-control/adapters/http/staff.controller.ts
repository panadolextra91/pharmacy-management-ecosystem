import { Request, Response, NextFunction } from 'express';
import staffService from '../../application/staff.service';

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
            res.status(200).json({ success: true, message: 'Staff deactivated' });
        } catch (error) {
            next(error);
        }
    }
}

export default new StaffController();
