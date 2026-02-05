import { Queue } from 'bullmq';
import RedisQueueClient from '../shared/queue/client';
import { NOTIFICATION_QUEUE_NAME } from '../modules/notifications/queue/notification.queue';
import { TOKEN_CLEANUP_QUEUE_NAME } from './token-cleanup.worker';
import logger from '../shared/utils/logger';

// Instantiate Queues to ensure they exist and we can add jobs
export const tokenCleanupQueue = new Queue(TOKEN_CLEANUP_QUEUE_NAME, { connection: RedisQueueClient.getInstance() });
export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, { connection: RedisQueueClient.getInstance() });

export async function setupQueues() {
    logger.info('⚙️ Setting up BullMQ Queues & Cron Jobs...');

    // 1. Token Cleanup: Run every day at 3:00 AM
    await tokenCleanupQueue.add('daily-cleanup', {}, {
        repeat: {
            pattern: '0 3 * * *', // Cron syntax
        },
        removeOnComplete: true
    });

    logger.info('✅ Registered Cron: Token Cleanup (Daily @ 3am)');

    // 2. Add other cron jobs here (e.g. Inventory Reconciliation)
    // await inventoryReconciliationQueue.add(...)

    logger.info('🚀 Queue System Ready');
}
