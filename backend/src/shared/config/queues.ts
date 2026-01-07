import { Queue } from 'bullmq';
import env from './env';

// BullMQ requires { connection: { host, port } } or IORedis instance.

// Let's use the explicit connection config based on env
// Assuming REDIS_URL=redis://localhost:6379

const redisUrl = new URL(env.REDIS_URL);

const redisConfig = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port),
};

export const notificationQueue = new Queue('notifications', {
    connection: redisConfig
});

export const schedulerQueue = new Queue('scheduler', {
    connection: redisConfig
});

export const QUEUE_CONNECTION = redisConfig;
