import prisma from '../shared/config/database';
import notificationService from '../modules/notifications/services/notification.service';
import logger from '../shared/utils/logger';

/**
 * Runs periodically (e.g. every minute) to find Reminders due SOON
 * and schedules them via NotificationService
 */
export async function runScheduler() {
    logger.info('Running Reminder Scheduler...');

    const now = new Date();
    // Logic: Find active reminders matching today's Day of Week and Time
    // This is complex in SQL/Prisma without native time support.
    // Simplified MVP: Fetch ALL active reminders, check JS logic, schedule if due within next 5 mins.

    // Better Approach: Store nextRunAt in MedicineReminder and query on that.
    // But schema uses `time` string and `frequency`.
    // Let's implement Next Run calculation.

    // For now, let's just query all active reminders and filter in code (MVP warning).
    // In production, we'd use a robust recurring event library or SQL view.

    const reminders = await prisma.medicineReminder.findMany({
        where: { isActive: true }
    });

    for (const reminder of reminders) {
        // Parse time "08:00"
        const [hour, minute] = reminder.time.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);

        // Check if today matches frequency
        // ... (Frequency logic here) ...
        // If match and time is within next window (or just recently passed and not sent)

        // This worker needs to be stateful or idempotent.
        // notificationService.scheduleNotification handles idempotency via DB check.

        // For this demo/MVP, let's assume we schedule for "Today" if time > now.
        if (scheduledTime > now) {
            await notificationService.scheduleNotification(reminder.id, scheduledTime);
        }
    }
}
