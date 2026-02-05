import { Queue, JobsOptions } from 'bullmq';
import logger from '../utils/logger';

/**
 * Safe Job Producer
 * Wraps queue.add in a try-catch to prevent Redis failures from crashing main API requests.
 */
export async function safeAddJob(queue: Queue, name: string, data: any, opts?: JobsOptions) {
    try {
        await queue.add(name, data, opts);
        logger.info(`✅ Job added to ${queue.name}: ${name}`);
        return true;
    } catch (error) {
        logger.error(`❌ Failed to add job to ${queue.name}. Data: ${JSON.stringify(data)}. Error:`, error);
        // We catch the error so the API request doesn't fail.
        // In a real production system, you might want to write to a backup file or Dead Letter Queue here.
        return false;
    }
}
