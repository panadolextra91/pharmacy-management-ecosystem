import { Worker } from 'bullmq';
import { QUEUE_CONNECTION } from '../shared/config/queues';
import notificationService from '../modules/notifications/services/notification.service';
import logger from '../shared/utils/logger';

export const notificationWorker = new Worker('notifications', async (job) => {
    if (job.name === 'send-reminder') {
        const { notificationId } = job.data;
        logger.info(`Processing send-reminder job for notification ${notificationId}`);
        await notificationService.sendPushNotification(notificationId);
    }
}, {
    connection: QUEUE_CONNECTION
});

notificationWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error ${err.message}`);
});
