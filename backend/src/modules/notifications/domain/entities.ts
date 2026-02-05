export interface ReminderNotificationEntity {
    id: string;
    reminderId: string;
    scheduledTime: Date;
    status: 'PENDING' | 'SENT' | 'FAILED';
    sentAt?: Date | null;
    errorMessage?: string | null;
    createdAt: Date;
    updatedAt: Date;
    reminder?: any;
}

export interface StaffNotificationEntity {
    id: string;
    staffId: string;
    pharmacyId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any | null;
    isRead: boolean;
    createdAt: Date;
    // Relations if needed, but entity usually flat or with nested objects
}
