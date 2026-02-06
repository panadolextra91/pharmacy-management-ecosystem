import { Queue } from 'bullmq';
import { QUEUE_CONNECTION } from './queues';

export const SECURITY_QUEUE_NAME = 'security';

export const securityQueue = new Queue(SECURITY_QUEUE_NAME, {
    connection: QUEUE_CONNECTION
});

// Job Types
export enum SecurityJobType {
    REVOKE_SESSION = 'RevokeSession',
    SECURITY_ALERT = 'SecurityAlert',
    DISCORD_ALERT = 'DiscordAlert'  // Kill Switch feature
}

// Job Payloads
export interface RevokeSessionPayload {
    userId: string;
    role: string;
    reason: 'REUSE_DETECTED' | 'PASSWORD_CHANGED' | 'ADMIN_ACTION';
    triggeredAt: Date;
}

export interface SecurityAlertPayload {
    userId: string;
    role: string;
    alertType: 'TOKEN_REUSE' | 'SUSPICIOUS_LOGIN' | 'PASSWORD_CHANGED';
    email?: string;
    metadata?: Record<string, any>;
}

export interface DiscordAlertPayload {
    alertType: 'TOKEN_REUSE' | 'ADMIN_BAN' | 'PASSWORD_CHANGED';
    userId: string;
    userType: string;
    userName?: string;
    adminEmail?: string;
    pharmacyName?: string;
}

// Helper to add jobs
export async function addSecurityJob(
    type: SecurityJobType,
    payload: RevokeSessionPayload | SecurityAlertPayload | DiscordAlertPayload
) {
    return securityQueue.add(type, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
    });
}

