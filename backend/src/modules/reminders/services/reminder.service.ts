import prisma from '../../../shared/config/database';
import { CreateReminderDto, UpdateReminderDto, ReminderQueryDto, ReminderActionDto } from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class ReminderService {
    async createReminder(customerId: string, data: CreateReminderDto) {
        return await prisma.medicineReminder.create({
            data: {
                customerId,
                medicineName: data.medicineName,
                dosage: data.dosage,
                frequencyType: data.frequencyType,
                specificDays: data.specificDays ? JSON.stringify(data.specificDays) : undefined,
                intervalDays: data.intervalDays,
                time: data.time,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                notes: data.notes
            }
        });
    }

    async getMyReminders(customerId: string, query: ReminderQueryDto) {
        const { page = 1, limit = 20, isActive } = query;
        const skip = (page - 1) * limit;

        const where: any = { customerId };
        if (isActive !== undefined) {
            where.isActive = isActive; // Expecting boolean conversion in controller or validation if coming from query string
        }

        const [reminders, total] = await Promise.all([
            prisma.medicineReminder.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { time: 'asc' }
            }),
            prisma.medicineReminder.count({ where })
        ]);

        return {
            data: reminders.map(r => ({
                ...r,
                specificDays: r.specificDays ? JSON.parse(r.specificDays as string) : null
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    async getReminderById(customerId: string, reminderId: string) {
        const reminder = await prisma.medicineReminder.findFirst({
            where: { id: reminderId, customerId }
        });

        if (!reminder) throw new AppError('Reminder not found', 404, 'NOT_FOUND');

        return {
            ...reminder,
            specificDays: reminder.specificDays ? JSON.parse(reminder.specificDays as string) : null
        };
    }

    async updateReminder(customerId: string, reminderId: string, data: UpdateReminderDto) {
        await this.getReminderById(customerId, reminderId); // Check exists

        const updated = await prisma.medicineReminder.update({
            where: { id: reminderId },
            data: {
                ...data,
                specificDays: data.specificDays ? JSON.stringify(data.specificDays) : undefined,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined
            }
        });

        return {
            ...updated,
            specificDays: updated.specificDays ? JSON.parse(updated.specificDays as string) : null
        };
    }

    async deleteReminder(customerId: string, reminderId: string) {
        await this.getReminderById(customerId, reminderId); // Check exists

        // Check logs to decide soft vs hard delete
        const logsCount = await prisma.reminderLog.count({ where: { reminderId } });
        if (logsCount > 0) {
            return await prisma.medicineReminder.update({
                where: { id: reminderId },
                data: { isActive: false }
            });
        }

        return await prisma.medicineReminder.delete({
            where: { id: reminderId }
        });
    }

    async logAction(customerId: string, reminderId: string, data: ReminderActionDto) {
        const reminder = await this.getReminderById(customerId, reminderId);

        let scheduledTime = new Date();
        let notificationId = data.notificationId;

        // 1. Link via provided Notification ID
        if (notificationId) {
            const notification = await prisma.reminderNotification.findUnique({
                where: { id: notificationId }
            });

            if (notification && notification.reminderId === reminderId) {
                scheduledTime = notification.scheduledTime;

                // Mark associated notification as ACKNOWLEDGED to prevent "Missed" worker
                if (['PENDING', 'SENT'].includes(notification.status)) {
                    await prisma.reminderNotification.update({
                        where: { id: notificationId },
                        data: {
                            status: 'ACKNOWLEDGED',
                            acknowledgedAt: new Date()
                        }
                    });
                }
            } else {
                notificationId = undefined; // Invalid ID, unlink
            }
        } else {
            // 2. Auto-link: Find recent pending/sent notification (last 60 mins) to close loop
            const recent = await prisma.reminderNotification.findFirst({
                where: {
                    reminderId,
                    status: { in: ['PENDING', 'SENT'] },
                    scheduledTime: {
                        gte: new Date(Date.now() - 60 * 60 * 1000),
                        lte: new Date(Date.now() + 15 * 60 * 1000)
                    }
                },
                orderBy: { scheduledTime: 'desc' }
            });

            if (recent) {
                notificationId = recent.id;
                scheduledTime = recent.scheduledTime;

                await prisma.reminderNotification.update({
                    where: { id: recent.id },
                    data: {
                        status: 'ACKNOWLEDGED',
                        acknowledgedAt: new Date()
                    }
                });
            }
        }

        return await prisma.reminderLog.create({
            data: {
                reminderId,
                customerId,
                medicineName: reminder.medicineName,
                dosage: reminder.dosage,
                actionType: data.actionType,
                scheduledTime: scheduledTime,
                actionTime: new Date(),
                notes: data.notes,
                notificationId: notificationId
            }
        });
    }

    // History/Adherence
    async getAdherenceHistory(customerId: string, _fromDate?: Date, _toDate?: Date) {
        return await prisma.reminderLog.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: 50 // limit
        });
    }
}

export default new ReminderService();
