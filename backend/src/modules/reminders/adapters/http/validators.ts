import { z } from 'zod';

export const createReminderSchema = z.object({
    body: z.object({
        medicineName: z.string().min(1, 'Medicine name is required'),
        dosage: z.string().min(1, 'Dosage is required'),
        frequencyType: z.enum(['DAILY', 'WEEKDAYS', 'WEEKENDS', 'SPECIFIC_DAYS', 'INTERVAL', 'ONE_TIME']),
        specificDays: z.array(z.number().min(1).max(7)).optional(),
        intervalDays: z.number().positive().optional(),
        time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format'),
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()).optional(),
        notes: z.string().optional()
    }).refine(data => {
        if (data.frequencyType === 'SPECIFIC_DAYS' && (!data.specificDays || data.specificDays.length === 0)) {
            return false;
        }
        if (data.frequencyType === 'INTERVAL' && !data.intervalDays) {
            return false;
        }
        return true;
    }, {
        message: "Invalid configuration for frequency type",
        path: ["frequencyType"]
    })
});

export const updateReminderSchema = z.object({
    body: z.object({
        medicineName: z.string().optional(),
        dosage: z.string().optional(),
        frequencyType: z.enum(['DAILY', 'WEEKDAYS', 'WEEKENDS', 'SPECIFIC_DAYS', 'INTERVAL', 'ONE_TIME']).optional(),
        specificDays: z.array(z.number().min(1).max(7)).optional(),
        intervalDays: z.number().positive().optional(),
        time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format').optional(),
        startDate: z.string().or(z.date()).optional(),
        endDate: z.string().or(z.date()).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional()
    })
});

export const reminderActionSchema = z.object({
    body: z.object({
        actionType: z.enum(['taken', 'skipped', 'missed']),
        actionTime: z.string().or(z.date()).optional(),
        notes: z.string().optional(),
        notificationId: z.string().optional()
    })
});
