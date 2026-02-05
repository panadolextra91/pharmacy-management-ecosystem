import { Request, Response } from 'express';
import { AppError } from '../../../../shared/middleware/error-handler.middleware';
import staffNotificationService from '../../application/staff-notification.service';
import { AuthenticatedRequest } from '../../../../shared/types/express';

class StaffNotificationController {
    async getNotifications(req: Request, res: Response) {
        const authReq = req as AuthenticatedRequest;
        const staffId = authReq.user?.id; // Assuming staff logs in
        // Note: If Owner logs in, they might not have a 'staffId' in the simplified schema if they use Owner table. 
        // But for "Staff Notifications", we rely on PharmacyStaff table. 
        // We'll assume the logged in user maps to a staff member for now, or we might need to handle Owner case separately if they share this endpoint.
        // For Phase 7, let's assume Staff/Manager context.

        if (!staffId) throw new AppError('Unauthorized', 401);

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

        const result = await staffNotificationService.getNotifications(staffId, page, limit, isRead);
        res.json(result);
    }

    async markAsRead(req: Request, res: Response) {
        const authReq = req as AuthenticatedRequest;
        const staffId = authReq.user?.id;
        const { id } = req.params;

        if (!staffId) throw new AppError('Unauthorized', 401);

        await staffNotificationService.markAsRead(id, staffId);
        res.json({ success: true, message: 'Notification marked as read' });
    }

    async markAllAsRead(req: Request, res: Response) {
        const authReq = req as AuthenticatedRequest;
        const staffId = authReq.user?.id;

        if (!staffId) throw new AppError('Unauthorized', 401);

        await staffNotificationService.markAllAsRead(staffId);
        res.json({ success: true, message: 'All notifications marked as read' });
    }

    async getUnreadCount(req: Request, res: Response) {
        const authReq = req as AuthenticatedRequest;
        const staffId = authReq.user?.id;

        if (!staffId) throw new AppError('Unauthorized', 401);

        const count = await staffNotificationService.getUnreadCount(staffId);
        res.json({ count });
    }
}

export default new StaffNotificationController();
