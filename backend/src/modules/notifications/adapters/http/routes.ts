import { Router } from 'express';
import staffNotificationController from './staff-notification.controller';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';

const router = Router();

// All notification routes require authentication and pharmacy context
router.use(authenticate);
router.use(requirePharmacyAccess);

// List notifications
router.get('/', staffNotificationController.getNotifications.bind(staffNotificationController));

// Badge count
router.get('/unread-count', staffNotificationController.getUnreadCount.bind(staffNotificationController));

// Actions
router.patch('/read-all', staffNotificationController.markAllAsRead.bind(staffNotificationController));
router.patch('/:id/read', staffNotificationController.markAsRead.bind(staffNotificationController));

export default router;
