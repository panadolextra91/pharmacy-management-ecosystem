import { ReminderNotificationEntity, StaffNotificationEntity } from '../domain/entities';

export interface INotificationRepository {
    // Reminder Notifications
    findPendingReminderNotification(reminderId: string, scheduledTime: Date): Promise<ReminderNotificationEntity | null>;
    createReminderNotification(data: any): Promise<ReminderNotificationEntity>;
    findReminderNotificationById(id: string): Promise<ReminderNotificationEntity | null>;
    updateReminderNotification(id: string, data: any): Promise<ReminderNotificationEntity>;
    acknowledgeReminderNotification(id: string): Promise<void>;
    findRecentReminderNotification(reminderId: string, fromDate: Date, toDate: Date): Promise<ReminderNotificationEntity | null>;
    createReminderLog(data: any): Promise<void>;

    // Staff Notifications
    findTargetStaff(pharmacyId: string, roles?: string[]): Promise<{ id: string }[]>;
    createManyStaffNotifications(data: any[]): Promise<void>;
    markStaffNotificationAsRead(id: string, staffId: string): Promise<void>;
    markAllStaffNotificationsAsRead(staffId: string): Promise<void>;
    getUnreadStaffNotificationCount(staffId: string): Promise<number>;
    findStaffNotifications(staffId: string, query: any): Promise<{ data: StaffNotificationEntity[]; total: number }>;
}
