import prisma from '../../../../shared/config/database';
import { IReminderRepository } from '../../ports/reminder.repository.port';
import { MedicineReminderEntity, ReminderLogEntity } from '../../domain/entities';

export class PrismaReminderRepository implements IReminderRepository {
    async create(data: any): Promise<MedicineReminderEntity> {
        return prisma.medicineReminder.create({
            data: {
                customerId: data.customerId,
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
        }) as unknown as MedicineReminderEntity;
    }

    async findAll(customerId: string, query: any): Promise<{ data: MedicineReminderEntity[]; total: number }> {
        const { page = 1, limit = 20, isActive } = query;
        const skip = (page - 1) * limit;

        const where: any = { customerId };
        if (isActive !== undefined) {
            where.isActive = isActive;
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

        return { data: reminders as unknown as MedicineReminderEntity[], total };
    }

    async findById(id: string, customerId: string): Promise<MedicineReminderEntity | null> {
        return prisma.medicineReminder.findFirst({
            where: { id, customerId }
        }) as unknown as MedicineReminderEntity;
    }

    async update(id: string, data: any): Promise<MedicineReminderEntity> {
        return prisma.medicineReminder.update({
            where: { id },
            data: {
                ...data,
                specificDays: data.specificDays ? JSON.stringify(data.specificDays) : undefined,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined
            }
        }) as unknown as MedicineReminderEntity;
    }

    async delete(id: string): Promise<MedicineReminderEntity> {
        return prisma.medicineReminder.delete({
            where: { id }
        }) as unknown as MedicineReminderEntity;
    }

    async softDelete(id: string): Promise<MedicineReminderEntity> {
        return prisma.medicineReminder.update({
            where: { id },
            data: { isActive: false }
        }) as unknown as MedicineReminderEntity;
    }

    async countLogs(reminderId: string): Promise<number> {
        return prisma.reminderLog.count({ where: { reminderId } });
    }

    async createLog(data: any): Promise<ReminderLogEntity> {
        return prisma.reminderLog.create({ data }) as unknown as ReminderLogEntity;
    }

    async findLogs(customerId: string, limit: number): Promise<ReminderLogEntity[]> {
        return prisma.reminderLog.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: limit
        }) as unknown as ReminderLogEntity[];
    }
}
