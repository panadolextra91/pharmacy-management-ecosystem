import { Queue } from 'bullmq';
import RedisQueueClient from '../../../shared/queue/client';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
    connection: RedisQueueClient.getInstance(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true, // Auto clean success jobs
        removeOnFail: 500       // Keep last 500 failed jobs for debugging
    }
});
