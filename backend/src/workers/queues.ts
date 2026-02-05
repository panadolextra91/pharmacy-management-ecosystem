import { Queue } from 'bullmq';
import RedisQueueClient from '../shared/queue/client';

export const INVENTORY_CLEANUP_QUEUE = 'inventory-cleanup';
export const INVENTORY_RECONCILIATION_QUEUE = 'inventory-reconciliation';

export const inventoryCleanupQueue = new Queue(INVENTORY_CLEANUP_QUEUE, { connection: RedisQueueClient.getInstance() });
export const inventoryReconciliationQueue = new Queue(INVENTORY_RECONCILIATION_QUEUE, { connection: RedisQueueClient.getInstance() });
