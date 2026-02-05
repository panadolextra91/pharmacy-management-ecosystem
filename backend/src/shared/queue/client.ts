import { Redis } from 'ioredis';
import logger from '../utils/logger';

/**
 * Singleton Redis connection for BullMQ
 * Ensures we don't open too many connections.
 */
class RedisQueueClient {
    private static instance: Redis;

    public static getInstance(): Redis {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL not defined');
        }

        if (!this.instance) {
            this.instance = new Redis(process.env.REDIS_URL, {
                // BullMQ Requirement: maxRetriesPerRequest must be null
                maxRetriesPerRequest: null,
                // Better retry strategy
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            });

            this.instance.on('connect', () => {
                logger.info('🎯 Redis Queue Client Connected');
            });

            this.instance.on('error', (err) => {
                logger.error('🔥 Redis Queue Client Error:', err);
            });

            this.instance.on('reconnecting', () => {
                logger.warn('🔄 Redis Queue Client Reconnecting...');
            });
        }

        return this.instance;
    }
}

export default RedisQueueClient;
