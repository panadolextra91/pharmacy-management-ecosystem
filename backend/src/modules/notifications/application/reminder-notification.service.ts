import { INotificationRepository } from '../ports/notification.repository.port';
import logger from '../../../shared/utils/logger';
import { notificationQueue } from '../../../shared/config/queues';

export class ReminderNotificationService {
    constructor(private readonly repository: INotificationRepository) { }

    async scheduleNotification(reminderId: string, scheduledTime: Date) {
        try {
            const existing = await this.repository.findPendingReminderNotification(reminderId, scheduledTime);
            if (existing) {
                logger.warn(`Notification for reminder ${reminderId} at ${scheduledTime} already exists.`);
                return existing;
            }

            const notification = await this.repository.createReminderNotification({
                reminderId,
                scheduledTime,
                status: 'PENDING'
            });

            await notificationQueue.add('send-reminder', { notificationId: notification.id }, {
                delay: Math.max(0, scheduledTime.getTime() - Date.now())
            });

            logger.info(`Scheduled notification ${notification.id} for reminder ${reminderId} at ${scheduledTime}`);
            return notification;
        } catch (error) {
            logger.error('Error scheduling notification:', error);
            throw error;
        }
    }

    async sendPushNotification(notificationId: string) {
        const notification = await this.repository.findReminderNotificationById(notificationId);
        if (!notification || notification.status !== 'PENDING') return;

        try {
            const { reminder } = notification;
            const message = `Time to take your ${reminder.medicineName} (${reminder.dosage})`;

            logger.info(`[PUSH] Sending to ${reminder.customer.fullName}: ${message}`);

            await this.repository.updateReminderNotification(notificationId, {
                status: 'SENT',
                sentAt: new Date()
            });

        } catch (error: any) {
            logger.error(`Failed to send notification ${notificationId}`, error);
            await this.repository.updateReminderNotification(notificationId, {
                status: 'FAILED',
                errorMessage: error.message
            });
        }
    }

    async markAsMissed(notificationId: string) {
        await this.repository.updateReminderNotification(notificationId, {
            status: 'FAILED',
            errorMessage: 'Missed by user (Timeout)'
        });

        const notif = await this.repository.findReminderNotificationById(notificationId);
        if (notif && notif.reminder) {
            await this.repository.createReminderLog({
                reminderId: notif.reminderId,
                customerId: (notif.reminder as any).customerId,
                medicineName: notif.reminder.medicineName,
                dosage: notif.reminder.dosage,
                actionType: 'missed',
                scheduledTime: notif.scheduledTime,
                actionTime: new Date(),
                notes: 'Auto-marked as missed'
            });
        }
    }

    async acknowledge(notificationId: string) {
        await this.repository.acknowledgeReminderNotification(notificationId);
    }

    async findMostRecentPending(reminderId: string): Promise<string | null> {
        // Look back 1 hour, forward 15 mins
        const fromDate = new Date(Date.now() - 60 * 60 * 1000);
        const toDate = new Date(Date.now() + 15 * 60 * 1000);

        const notification = await this.repository.findRecentReminderNotification(reminderId, fromDate, toDate);
        return notification ? notification.id : null;
    }
}

import { PrismaNotificationRepository } from '../adapters/database/prisma-notification.repository';
export default new ReminderNotificationService(new PrismaNotificationRepository());
