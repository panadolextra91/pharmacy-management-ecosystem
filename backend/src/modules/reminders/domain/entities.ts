export interface MedicineReminderEntity {
    id: string;
    customerId: string;
    medicineName: string;
    dosage: string;
    frequencyType: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'SPECIFIC_DAYS' | 'INTERVAL' | 'ONE_TIME';
    specificDays?: number[] | null; // stored as JSON in DB, parsed in Entity
    intervalDays?: number | null;
    time: string;
    startDate: Date;
    endDate?: Date | null;
    notes?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    customer?: any;
}

export interface ReminderLogEntity {
    id: string;
    reminderId: string;
    customerId: string;
    medicineName: string;
    dosage: string;
    actionType: 'taken' | 'skipped' | 'missed';
    scheduledTime: Date;
    actionTime: Date;
    notes?: string | null;
    notificationId?: string | null;
    createdAt: Date;
}
