import prisma from '../../../shared/config/database';
// import { ReminderNotification, NotificationStatus } from '@prisma/client';
import logger from '../../../shared/utils/logger';
import { notificationQueue } from '../../../shared/config/queues';

class NotificationService {
    /**
     * Creates a notification record and queues it for sending
     */
    async scheduleNotification(reminderId: string, scheduledTime: Date) {
        try {
            // Check if already scheduled
            const existing = await prisma.reminderNotification.findFirst({
                where: {
                    reminderId,
                    scheduledTime: {
                        equals: scheduledTime
                    },
                    status: 'PENDING'
                }
            });

            if (existing) {
                logger.warn(`Notification for reminder ${reminderId} at ${scheduledTime} already exists.`);
                return existing;
            }

            const notification = await prisma.reminderNotification.create({
                data: {
                    reminderId,
                    scheduledTime,
                    status: 'PENDING'
                }
            });

            // Push to BullMQ
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

    /**
     * Called by Worker when processing the job
     */
    async sendPushNotification(notificationId: string) {
        const notification = await prisma.reminderNotification.findUnique({
            where: { id: notificationId },
            include: { reminder: { include: { customer: true } } }
        });

        if (!notification || notification.status !== 'PENDING') return;

        try {
            // Mock Push Logic (Expo later)
            const { reminder } = notification;
            const message = `Time to take your ${reminder.medicineName} (${reminder.dosage})`;

            // In real app: sendExpoPushNotification(reminder.customer.pushToken, message)
            logger.info(`[PUSH] Sending to ${reminder.customer.fullName}: ${message}`);

            await prisma.reminderNotification.update({
                where: { id: notificationId },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

        } catch (error: any) {
            logger.error(`Failed to send notification ${notificationId}`, error);
            await prisma.reminderNotification.update({
                where: { id: notificationId },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message
                }
            });
        }
    }

    async markAsMissed(notificationId: string) {
        await prisma.reminderNotification.update({
            where: { id: notificationId },
            data: { status: 'FAILED', errorMessage: 'Missed by user (Timeout)' }
        });

        // Also log to ReminderLog as MISSED
        const notif = await prisma.reminderNotification.findUnique({
            where: { id: notificationId },
            include: { reminder: true }
        });

        if (notif) {
            await prisma.reminderLog.create({
                data: {
                    reminderId: notif.reminderId,
                    customerId: (notif.reminder as any).customerId,
                    medicineName: notif.reminder.medicineName,
                    dosage: notif.reminder.dosage,
                    actionType: 'missed',
                    scheduledTime: notif.scheduledTime,
                    actionTime: new Date(),
                    notes: 'Auto-marked as missed'
                }
            });
        }
    }
}

export default new NotificationService();
