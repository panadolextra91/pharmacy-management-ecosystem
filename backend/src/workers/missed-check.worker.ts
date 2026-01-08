import prisma from '../shared/config/database';
import notificationService from '../modules/notifications/services/notification.service';
import logger from '../shared/utils/logger';

/**
 * Runs periodically to find PENDING/SENT notifications that are older than 15 mins
 * and mark them as missed if no action taken.
 */
export async function runMissedCheck() {
    logger.info('Running Missed Check...');

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    const staleNotifications = await prisma.reminderNotification.findMany({
        where: {
            status: { in: ['SENT', 'PENDING'] },
            scheduledTime: { lt: fifteenMinsAgo },
            // Ensure no log exists? Or rely on status not being ACKNOWLEDGED?
            // If user takes it, we should update status to ACKNOWLEDGED.
            // Assumption: Taking update status.
        }
    });

    for (const notif of staleNotifications) {
        logger.info(`Marking notification ${notif.id} as missed (Timeout)`);
        await notificationService.markAsMissed(notif.id);
    }
}
