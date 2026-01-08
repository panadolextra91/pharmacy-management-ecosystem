import prisma from '../../../shared/config/database';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class StaffService {
    async getAllStaff(pharmacyId: string) {
        return prisma.pharmacyStaff.findMany({
            where: { pharmacyId, isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                username: true,
                createdAt: true
            }
        });
    }

    async updateStaff(staffId: string, pharmacyId: string, data: any) {
        // Ensure staff belongs to pharmacy
        const staff = await prisma.pharmacyStaff.findFirst({
            where: { id: staffId, pharmacyId }
        });

        if (!staff) throw new AppError('Staff not found', 404, 'NOT_FOUND');

        return prisma.pharmacyStaff.update({
            where: { id: staffId },
            data: {
                name: data.name,
                role: data.role,
                isActive: data.isActive
            },
            select: { id: true, name: true, role: true, isActive: true }
        });
    }

    async deleteStaff(staffId: string, pharmacyId: string) {
        // Ensure staff belongs to pharmacy
        const staff = await prisma.pharmacyStaff.findFirst({
            where: { id: staffId, pharmacyId }
        });

        if (!staff) throw new AppError('Staff not found', 404, 'NOT_FOUND');

        // Soft delete
        return prisma.pharmacyStaff.update({
            where: { id: staffId },
            data: { isActive: false }
        });
    }
}

export default new StaffService();
