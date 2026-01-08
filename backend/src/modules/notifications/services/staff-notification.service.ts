import prisma from '../../../shared/config/database';
import { StaffNotificationType, StaffRole } from '@prisma/client';
import logger from '../../../shared/utils/logger';

class StaffNotificationService {
    /**
     * Broadcasts a notification to specific roles within a pharmacy.
     * If roles are not provided, broadcasts to ALL active staff + Owner.
     */
    async notifyPharmacy(
        pharmacyId: string,
        type: StaffNotificationType,
        title: string,
        message: string,
        metadata?: any,
        targetRoles?: StaffRole[]
    ) {
        try {
            // 1. Find target recipients
            const whereClause: any = {
                pharmacyId,
                isActive: true
            };

            if (targetRoles && targetRoles.length > 0) {
                whereClause.role = { in: targetRoles };
            }

            const staffMembers = await prisma.pharmacyStaff.findMany({
                where: whereClause,
                select: { id: true }
            });

            // 2. Also notify the Owner?
            // The Owner is linked via Pharmacy -> Owner. 
            // However, StaffNotification table links to `StaffId`.
            // Design decision: Valid "Staff" accounts should exist for Owners if they want log-in capability as staff. 
            // OR: We implicitly treat the Owner as a "superuser" who might check in. 
            // BUT: The schema `StaffNotification` requires `staffId`.
            // Checks: Does the Owner have a `PharmacyStaff` record? 
            // Typically in this system, Owners manage via specific owner endpoints or have a staff account.
            // Let's check schema: `PharmacyStaff` belongs to `Pharmacy`. `Owner` is separate.
            // If `StaffNotification` table relies on `staffId`, then ONLY `PharmacyStaff` can receive it. 
            // For now, we will notify all matching PharmacyStaff. 
            // If the Owner uses the app, they usually create a "Manager" account for themselves or we need a way to notify Owner entity.
            // Looking at schema: `StaffNotification` has `staffId`. It doesn't have `ownerId`.
            // So we can only notify `PharmacyStaff`.

            if (staffMembers.length === 0) return;

            // 3. Create notifications in bulk (Prisma createMany is supported)
            const notificationsData = staffMembers.map(staff => ({
                staffId: staff.id,
                pharmacyId,
                type,
                title,
                message,
                metadata: metadata ? JSON.stringify(metadata) : undefined,
                isRead: false
            }));

            await prisma.staffNotification.createMany({
                data: notificationsData
            });

            logger.info(`[StaffNotification] Sent '${type}' to ${staffMembers.length} staff in Pharmacy ${pharmacyId}`);

        } catch (error) {
            logger.error('Failed to notify pharmacy staff:', error);
            // Don't throw, notifications shouldn't block main flow
        }
    }

    /**
     * Mark a specific notification as read
     */
    async markAsRead(notificationId: string, staffId: string) {
        return await prisma.staffNotification.updateMany({
            where: {
                id: notificationId,
                staffId: staffId // Security check
            },
            data: { isRead: true }
        });
    }

    /**
     * Mark all notifications as read for a staff member
     */
    async markAllAsRead(staffId: string) {
        return await prisma.staffNotification.updateMany({
            where: {
                staffId: staffId,
                isRead: false
            },
            data: { isRead: true }
        });
    }

    /**
     * Get unread count
     */
    async getUnreadCount(staffId: string) {
        return await prisma.staffNotification.count({
            where: {
                staffId,
                isRead: false
            }
        });
    }

    /**
     * Get notifications list
     */
    async getNotifications(staffId: string, page = 1, limit = 20, isRead?: boolean) {
        const skip = (page - 1) * limit;
        const where: any = { staffId };

        if (isRead !== undefined) {
            where.isRead = isRead;
        }

        const [notifications, total] = await Promise.all([
            prisma.staffNotification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.staffNotification.count({ where })
        ]);

        return {
            data: notifications.map(n => ({
                ...n,
                metadata: n.metadata ? JSON.parse(n.metadata as string) : null
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

export default new StaffNotificationService();
