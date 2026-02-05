import { MedicineReminderEntity, ReminderLogEntity } from '../domain/entities';

export interface IReminderRepository {
    create(data: any): Promise<MedicineReminderEntity>;
    findAll(customerId: string, query: any): Promise<{ data: MedicineReminderEntity[]; total: number }>;
    findById(id: string, customerId: string): Promise<MedicineReminderEntity | null>;
    update(id: string, data: any): Promise<MedicineReminderEntity>;
    delete(id: string): Promise<MedicineReminderEntity>;
    softDelete(id: string): Promise<MedicineReminderEntity>;

    // Logs
    countLogs(reminderId: string): Promise<number>;
    createLog(data: any): Promise<ReminderLogEntity>;
    findLogs(customerId: string, limit: number): Promise<ReminderLogEntity[]>;
}
