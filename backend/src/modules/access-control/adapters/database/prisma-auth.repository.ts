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

    async updateStaff(id: string, pharmacyId: string, data: any): Promise<StaffEntity> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        return tenantPrisma.pharmacyStaff.update({
            where: { id },
            data,
            select: { id: true, name: true, role: true, isActive: true, pharmacyId: true, email: true, username: true, createdAt: true, updatedAt: true }
        }) as unknown as StaffEntity;
    }

    async deleteStaff(id: string, pharmacyId: string): Promise<void> {
        const tenantPrisma = createTenantPrisma(pharmacyId);
        await tenantPrisma.pharmacyStaff.update({
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

    // Pharma Sales Rep
    async findPharmaRepByEmail(email: string): Promise<any | null> {
        return prisma.pharmaSalesRep.findUnique({ where: { email } });
    }

    async updatePharmaRepOtp(email: string, otp: string, expiresAt: Date): Promise<void> {
        await prisma.pharmaSalesRep.update({
            where: { email },
            data: {
                lastOtp: otp,
                otpExpiresAt: expiresAt,
                isVerified: false
            }
        });
    }

    async verifyPharmaRepOtp(email: string, otp: string): Promise<any | null> {
        return prisma.pharmaSalesRep.findFirst({
            where: {
                email,
                lastOtp: otp,
                otpExpiresAt: { gt: new Date() }
            }
        });
    }

    // Refresh Token
    async saveRefreshToken(data: { token: string; expiresAt: Date; userId: string; role: string }): Promise<void> {
        // Map role to specific relation
        const relationData: any = {};
        if (data.role === 'OWNER') relationData.ownerId = data.userId;
        else if (data.role === 'STAFF' || data.role === 'PHARMACIST' || data.role === 'MANAGER') relationData.staffId = data.userId;
        else if (data.role === 'CUSTOMER') relationData.customerId = data.userId;
        else if (data.role === 'SYSTEM_ADMIN') relationData.adminId = data.userId;

        await prisma.refreshToken.create({
            data: {
                token: data.token,
                expiresAt: data.expiresAt,
                ...relationData
            }
        });
    }

    async findRefreshToken(token: string): Promise<any | null> {
        return prisma.refreshToken.findUnique({
            where: { token },
            include: {
                owner: true,
                staff: true,
                customer: true,
                admin: true
            }
        });
    }

    async revokeRefreshToken(token: string, replacedBy?: string): Promise<void> {
        await prisma.refreshToken.update({
            where: { token },
            data: {
                revokedAt: new Date(),
                replacedBy
            }
        });
    }

    async revokeAllUserTokens(userId: string, role: string): Promise<void> {
        const whereClause: any = {};
        if (role === 'OWNER') whereClause.ownerId = userId;
        else if (['STAFF', 'PHARMACIST', 'MANAGER'].includes(role)) whereClause.staffId = userId;
        else if (role === 'CUSTOMER') whereClause.customerId = userId;
        else if (role === 'SYSTEM_ADMIN') whereClause.adminId = userId;

        await prisma.refreshToken.updateMany({
            where: {
                ...whereClause,
                revokedAt: null // Only revoke currently valid tokens
            },
            data: {
                revokedAt: new Date()
            }
        });
    }
}
