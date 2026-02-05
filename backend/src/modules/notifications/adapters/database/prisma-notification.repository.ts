import prisma from '../../../../shared/config/database';
import { createTenantPrisma } from '../../../../shared/prisma/client';
import { INotificationRepository } from '../../ports/notification.repository.port';
import { ReminderNotificationEntity, StaffNotificationEntity } from '../../domain/entities';
// Note: StaffNotificationType and StaffRole types available from @prisma/client if needed

export class PrismaNotificationRepository implements INotificationRepository {
    // Reminder Notifications
    async findPendingReminderNotification(reminderId: string, scheduledTime: Date): Promise<ReminderNotificationEntity | null> {
        return prisma.reminderNotification.findFirst({
            where: {
                reminderId,
                scheduledTime: { equals: scheduledTime },
                status: 'PENDING'
            }
        }) as unknown as ReminderNotificationEntity;
    }

    async createReminderNotification(data: any): Promise<ReminderNotificationEntity> {
        return prisma.reminderNotification.create({ data }) as unknown as ReminderNotificationEntity;
    }

    async findReminderNotificationById(id: string): Promise<ReminderNotificationEntity | null> {
        return prisma.reminderNotification.findUnique({
            where: { id },
            include: { reminder: { include: { customer: true } } }
        }) as unknown as ReminderNotificationEntity;
    }

    async updateReminderNotification(id: string, data: any): Promise<ReminderNotificationEntity> {
        return prisma.reminderNotification.update({
            where: { id },
            data
        }) as unknown as ReminderNotificationEntity;
    }

    async acknowledgeReminderNotification(id: string): Promise<void> {
        await prisma.reminderNotification.update({
            where: { id },
            data: {
                status: 'ACKNOWLEDGED',
                acknowledgedAt: new Date()
            }
        });
    }

    async findRecentReminderNotification(reminderId: string, fromDate: Date, toDate: Date): Promise<ReminderNotificationEntity | null> {
        return prisma.reminderNotification.findFirst({
            where: {
                reminderId,
                status: { in: ['PENDING', 'SENT'] }, // Only un-acknowledged
                scheduledTime: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            orderBy: { scheduledTime: 'desc' }
        }) as unknown as ReminderNotificationEntity;
    }

    async createReminderLog(data: any): Promise<void> {
        await prisma.reminderLog.create({ data });
    }

    // Staff Notifications
    async findTargetStaff(pharmacyId: string, roles?: string[]): Promise<{ id: string }[]> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        const whereClause: any = { isActive: true };
        if (roles && roles.length > 0) {
            whereClause.role = { in: roles };
        }
        return tenantPrisma.pharmacyStaff.findMany({
            where: whereClause,
            select: { id: true }
        });
    }

    async createManyStaffNotifications(pharmacyId: string, data: any[]): Promise<void> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        await tenantPrisma.staffNotification.createMany({ data });
    }

    async markStaffNotificationAsRead(id: string, staffId: string, pharmacyId: string): Promise<void> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        await tenantPrisma.staffNotification.updateMany({
            where: { id, staffId },
            data: { isRead: true }
        });
    }

    async markAllStaffNotificationsAsRead(staffId: string, pharmacyId: string): Promise<void> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        await tenantPrisma.staffNotification.updateMany({
            where: { staffId, isRead: false },
            data: { isRead: true }
        });
    }

    async getUnreadStaffNotificationCount(staffId: string, pharmacyId: string): Promise<number> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.staffNotification.count({
            where: { staffId, isRead: false }
        });
    }

    async findStaffNotifications(staffId: string, pharmacyId: string, query: any): Promise<{ data: StaffNotificationEntity[]; total: number }> {
        const { page = 1, limit = 20, isRead } = query;
        const skip = (page - 1) * limit;
        const tenantPrisma = createTenantPrisma(pharmacyId);
        const where: any = { staffId };

        if (isRead !== undefined) {
            where.isRead = isRead;
        }

        const [notifications, total] = await Promise.all([
            tenantPrisma.staffNotification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            tenantPrisma.staffNotification.count({ where })
        ]);

        return { data: notifications as unknown as StaffNotificationEntity[], total };
    }
}
