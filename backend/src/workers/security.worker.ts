import { Worker, Job } from 'bullmq';
import { QUEUE_CONNECTION } from '../shared/config/queues';
import {
    SECURITY_QUEUE_NAME,
    SecurityJobType,
    RevokeSessionPayload,
    SecurityAlertPayload,
    DiscordAlertPayload
} from '../shared/config/security.queue';
import { sendDiscordAlert } from '../shared/services/discord.service';

const securityWorker = new Worker(
    SECURITY_QUEUE_NAME,
    async (job: Job) => {
        console.log(`[Security Worker] Processing job: ${job.name} (ID: ${job.id})`);

        switch (job.name) {
            case SecurityJobType.REVOKE_SESSION:
                await handleRevokeSession(job.data as RevokeSessionPayload);
                break;
            case SecurityJobType.SECURITY_ALERT:
                await handleSecurityAlert(job.data as SecurityAlertPayload);
                break;
            case SecurityJobType.DISCORD_ALERT:
                await handleDiscordAlert(job.data as DiscordAlertPayload);
                break;
            default:
                console.warn(`[Security Worker] Unknown job type: ${job.name}`);
        }
    },
    { connection: QUEUE_CONNECTION }
);

async function handleRevokeSession(payload: RevokeSessionPayload) {
    console.log(`[Security] Revoking all sessions for user ${payload.userId} (${payload.role})`);
    console.log(`[Security] Reason: ${payload.reason}`);
    // Token revocation already done synchronously in AuthService.
    // This job is for audit logging and potential email notification.
    console.log(`[Security] Session revocation complete for ${payload.userId}`);
}

async function handleSecurityAlert(payload: SecurityAlertPayload) {
    console.log(`[Security] Sending security alert for user ${payload.userId}`);
    console.log(`[Security] Alert type: ${payload.alertType}`);

    if (payload.email) {
        // Mock email send - replace with real mail service in production
        console.log(`[Security] EMAIL SENT to ${payload.email}: Your account security was triggered.`);
    }

    console.log(`[Security] Alert processed for ${payload.userId}`);
}

async function handleDiscordAlert(payload: DiscordAlertPayload) {
    console.log(`[Security] Sending Discord alert: ${payload.alertType} for user ${payload.userId}`);

    const sent = await sendDiscordAlert(payload.alertType, {
        userId: payload.userId,
        userType: payload.userType,
        userName: payload.userName,
        adminEmail: payload.adminEmail,
        pharmacyName: payload.pharmacyName
    });

    if (sent) {
        console.log(`[Security] ✅ Discord alert sent successfully`);
    } else {
        console.log(`[Security] ⚠️ Discord alert throttled or failed`);
    }
}

// Event handlers
securityWorker.on('completed', (job) => {
    console.log(`[Security Worker] Job ${job.id} completed successfully`);
});

securityWorker.on('failed', (job, err) => {
    console.error(`[Security Worker] Job ${job?.id} failed:`, err.message);
});

export default securityWorker;

