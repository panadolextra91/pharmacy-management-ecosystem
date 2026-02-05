import { Worker, Job } from 'bullmq';
import RedisQueueClient from '../shared/queue/client';
import prisma from '../shared/config/database';
import logger from '../shared/utils/logger';

// Queue Name is implicit for this worker, let's keep it consistent
export const TOKEN_CLEANUP_QUEUE_NAME = 'token-cleanup';

const worker = new Worker(TOKEN_CLEANUP_QUEUE_NAME, async (_job: Job) => {
    logger.info('[TOKEN CLEANUP] 🧹 Starting cleanup job...');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Delete Expired Tokens
    const expiredResult = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: { lt: now }
        }
    });

    // 2. Delete Old Revoked Tokens
    const revokedResult = await prisma.refreshToken.deleteMany({
        where: {
            revokedAt: { lt: thirtyDaysAgo }
        }
    });

    return {
        expiredDeleted: expiredResult.count,
        revokedDeleted: revokedResult.count
    };

}, {
    connection: RedisQueueClient.getInstance()
});

worker.on('completed', (job, returnValue) => {
    logger.info(`[TOKEN CLEANUP] ✅ Job ${job.id} completed. Removed: ${JSON.stringify(returnValue)}`);
});

worker.on('failed', (job, err) => {
    logger.error(`[TOKEN CLEANUP] ❌ Job ${job?.id} failed: ${err.message}`);
});

export default worker;
