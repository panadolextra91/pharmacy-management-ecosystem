import prisma from '../../../../shared/config/database';
import { createTenantPrisma } from '../../../../shared/prisma/client';
import { IAuthRepository } from '../../ports/auth.repository.port';
import { OwnerEntity, StaffEntity, CustomerEntity, OtpEntity } from '../../domain/entities';

export class PrismaAuthRepository implements IAuthRepository {
    // Owner
    async findOwnerByEmail(email: string): Promise<OwnerEntity | null> {
        return prisma.owner.findUnique({ where: { email } });
    }

    async createOwner(data: any): Promise<OwnerEntity> {
        return prisma.owner.create({ data });
    }

    // Staff
    async findStaffByEmail(email: string): Promise<StaffEntity | null> {
        return prisma.pharmacyStaff.findUnique({
            where: { email },
            include: { pharmacy: true }
        }) as unknown as StaffEntity;
    }

    async createStaff(data: any): Promise<StaffEntity> {
        return prisma.pharmacyStaff.create({ data }) as unknown as StaffEntity;
    }

    async findPharmacyById(id: string): Promise<{ id: string; isActive: boolean } | null> {
        return prisma.pharmacy.findUnique({
            where: { id },
            select: { id: true, isActive: true }
        });
    }

    // Customer
    async findCustomerByPhone(phone: string): Promise<CustomerEntity | null> {
        return prisma.customer.findUnique({ where: { phone } });
    }

    async createCustomer(data: any): Promise<CustomerEntity> {
        return prisma.customer.create({ data });
    }

    async updateCustomerVerified(id: string): Promise<CustomerEntity> {
        return prisma.customer.update({
            where: { id },
            data: { verified: true, verifiedAt: new Date() }
        });
    }

    // OTP
    async deleteUnusedOtps(phone: string): Promise<void> {
        await prisma.otp.deleteMany({
            where: { phone, isUsed: false }
        });
    }

    async createOtp(data: { phone: string; otp: string; expiresAt: Date }): Promise<OtpEntity> {
        return prisma.otp.create({ data });
    }

    async findValidOtp(phone: string, otp: string): Promise<OtpEntity | null> {
        return prisma.otp.findFirst({
            where: {
                phone,
                otp,
                isUsed: false,
                expiresAt: { gt: new Date() }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async markOtpUsed(id: string): Promise<void> {
        await prisma.otp.update({
            where: { id },
            data: { isUsed: true }
        });
    }

    // System Admin
    async findAdminByEmail(email: string): Promise<{ id: string; email: string; password: string; name: string } | null> {
        return prisma.systemAdmin.findUnique({ where: { email } });
    }

    async createAdmin(data: any): Promise<{ id: string; email: string; name: string }> {
        return prisma.systemAdmin.create({ data });
    }

    async findAdminById(id: string): Promise<{ id: string; email: string; role: string } | null> {
        const admin = await prisma.systemAdmin.findUnique({ where: { id } });
        return admin ? { ...admin, role: 'SYSTEM_ADMIN' } : null;
    }

    // Staff Management
    async findAllStaff(pharmacyId: string): Promise<StaffEntity[]> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.pharmacyStaff.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true, role: true, username: true, createdAt: true, pharmacyId: true, isActive: true, updatedAt: true }
        }) as unknown as StaffEntity[];
    }

    async findStaffById(id: string, pharmacyId: string): Promise<StaffEntity | null> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.pharmacyStaff.findFirst({
            where: { id }
        }) as unknown as StaffEntity;
    }

    async updateStaff(id: string, data: any): Promise<StaffEntity> {
        return prisma.pharmacyStaff.update({
            where: { id },
            data,
            select: { id: true, name: true, role: true, isActive: true, pharmacyId: true, email: true, username: true, createdAt: true, updatedAt: true }
        }) as unknown as StaffEntity;
    }

    async deleteStaff(id: string): Promise<void> {
        await prisma.pharmacyStaff.update({
            where: { id },
            data: { isActive: false }
        });
    }

    // General
    async findPermittedPharmacies(ownerId: string): Promise<{ id: string; name: string }[]> {
        return prisma.pharmacy.findMany({
            where: { ownerId, isActive: true },
            select: { id: true, name: true }
        });
    }
}
