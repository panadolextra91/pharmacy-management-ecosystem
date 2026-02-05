import { INotificationRepository } from '../ports/notification.repository.port';
import { StaffNotificationType, StaffRole } from '@prisma/client';
import logger from '../../../shared/utils/logger';

export class StaffNotificationService {
    constructor(private readonly repository: INotificationRepository) { }

    async notifyPharmacy(
        pharmacyId: string,
        type: StaffNotificationType,
        title: string,
        message: string,
        metadata?: any,
        targetRoles?: StaffRole[]
    ) {
        try {
            const staffMembers = await this.repository.findTargetStaff(pharmacyId, targetRoles);

            if (staffMembers.length === 0) return;

            const notificationsData = staffMembers.map(staff => ({
                staffId: staff.id,
                pharmacyId,
                type,
                title,
                message,
                metadata: metadata ? JSON.stringify(metadata) : undefined,
                isRead: false
            }));

            await this.repository.createManyStaffNotifications(pharmacyId, notificationsData);

            logger.info(`[StaffNotification] Sent '${type}' to ${staffMembers.length} staff in Pharmacy ${pharmacyId}`);

        } catch (error) {
            logger.error('Failed to notify pharmacy staff:', error);
        }
    }

    async markAsRead(notificationId: string, staffId: string, pharmacyId: string) {
        return await this.repository.markStaffNotificationAsRead(notificationId, staffId, pharmacyId);
    }

    async markAllAsRead(staffId: string, pharmacyId: string) {
        return await this.repository.markAllStaffNotificationsAsRead(staffId, pharmacyId);
    }

    async getUnreadCount(staffId: string, pharmacyId: string) {
        return await this.repository.getUnreadStaffNotificationCount(staffId, pharmacyId);
    }

    async getNotifications(staffId: string, pharmacyId: string, page = 1, limit = 20, isRead?: boolean) {
        const result = await this.repository.findStaffNotifications(staffId, pharmacyId, { page, limit, isRead });

        return {
            data: result.data.map(n => ({
                ...n,
                metadata: n.metadata ? JSON.parse(n.metadata as string) : null
            })),
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        };
    }
}

import { PrismaNotificationRepository } from '../adapters/database/prisma-notification.repository';
export default new StaffNotificationService(new PrismaNotificationRepository());
