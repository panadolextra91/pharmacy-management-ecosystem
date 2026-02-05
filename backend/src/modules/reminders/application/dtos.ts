// import { MedicineReminder, NotificationStatus } from '@prisma/client';

export interface CreateReminderDto {
    medicineName: string;
    dosage: string;
    frequencyType: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'SPECIFIC_DAYS' | 'INTERVAL' | 'ONE_TIME';
    specificDays?: number[]; // 1-7 (Mon-Sun)
    intervalDays?: number;
    time: string; // "08:00"
    startDate: Date | string;
    endDate?: Date | string;
    notes?: string;
}

export interface UpdateReminderDto extends Partial<CreateReminderDto> {
    isActive?: boolean;
}

export interface ReminderActionDto {
    actionType: 'taken' | 'skipped' | 'missed';
    actionTime?: Date | string;
    notes?: string;
    notificationId?: string;
}

export interface ReminderQueryDto {
    page?: number;
    limit?: number;
    isActive?: boolean;
}
