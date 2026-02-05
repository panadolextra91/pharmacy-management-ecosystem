import { Worker, Job } from 'bullmq';
import RedisQueueClient from '../../../shared/queue/client';
import logger from '../../../shared/utils/logger';
import { NOTIFICATION_QUEUE_NAME } from './notification.queue';
// We import the Service dynamically to avoid circular deps if any, 
// OR purely for separation. For now standard import is fine.
import notificationService from '../application/staff-notification.service'; // Adjust path if needed

const worker = new Worker(NOTIFICATION_QUEUE_NAME, async (job: Job) => {
    logger.info(`🔨 Processing Notification Job: ${job.name} (ID: ${job.id})`);

    const { pharmacyId, type, title, message, data } = job.data;

    try {
        await notificationService.notifyPharmacy(pharmacyId, type, title, message, data);
        logger.info(`✅ Notification Job Completed: ${job.id}`);
    } catch (error) {
        logger.error(`❌ Notification Job Failed: ${job.id}`, error);
        throw error; // Throw so BullMQ knows to retry
    }

}, {
    connection: RedisQueueClient.getInstance(),
    concurrency: 5 // Process 5 notifications in parallel
});

worker.on('failed', (job, err) => {
    logger.error(`🔥 Job ${job?.id} has failed max retries: ${err.message}`);
});

export default worker;
