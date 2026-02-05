import { AppError } from '../../../shared/middleware/error-handler.middleware';
import { IAuthRepository } from '../ports/auth.repository.port';

export class StaffService {
    constructor(private readonly repository: IAuthRepository) { }

    async getAllStaff(pharmacyId: string) {
        return this.repository.findAllStaff(pharmacyId);
    }

    async updateStaff(staffId: string, pharmacyId: string, data: any) {
        const staff = await this.repository.findStaffById(staffId, pharmacyId);
        if (!staff) throw new AppError('Staff not found', 404, 'NOT_FOUND');

        return this.repository.updateStaff(staffId, {
            name: data.name,
            role: data.role,
            isActive: data.isActive
        });
    }

    async deleteStaff(staffId: string, pharmacyId: string) {
        const staff = await this.repository.findStaffById(staffId, pharmacyId);
        if (!staff) throw new AppError('Staff not found', 404, 'NOT_FOUND');

        await this.repository.deleteStaff(staffId);
        return { message: 'Staff deleted successfully' };
    }
}

import { PrismaAuthRepository } from '../adapters/database/prisma-auth.repository';
export default new StaffService(new PrismaAuthRepository());
