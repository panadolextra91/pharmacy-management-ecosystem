import { OwnerEntity, StaffEntity, CustomerEntity, OtpEntity } from '../domain/entities';

export interface IAuthRepository {
    // Owner
    findOwnerByEmail(email: string): Promise<OwnerEntity | null>;
    createOwner(data: any): Promise<OwnerEntity>;

    // Staff
    findStaffByEmail(email: string): Promise<StaffEntity | null>;
    createStaff(data: any): Promise<StaffEntity>;
    findPharmacyById(id: string): Promise<{ id: string; isActive: boolean } | null>; // Helper for validation

    // Customer
    findCustomerByPhone(phone: string): Promise<CustomerEntity | null>;
    createCustomer(data: any): Promise<CustomerEntity>;
    updateCustomerVerified(id: string): Promise<CustomerEntity>;

    // OTP
    deleteUnusedOtps(phone: string): Promise<void>;
    createOtp(data: { phone: string; otp: string; expiresAt: Date }): Promise<OtpEntity>;
    findValidOtp(phone: string, otp: string): Promise<OtpEntity | null>;
    markOtpUsed(id: string): Promise<void>;

    // System Admin
    findAdminByEmail(email: string): Promise<{ id: string; email: string; password: string; name: string } | null>;
    createAdmin(data: any): Promise<{ id: string; email: string; name: string }>;
    findAdminById(id: string): Promise<{ id: string; email: string; role: string } | null>;

    // Staff Management
    findAllStaff(pharmacyId: string): Promise<StaffEntity[]>;
    findStaffById(id: string, pharmacyId: string): Promise<StaffEntity | null>;
    updateStaff(id: string, data: any): Promise<StaffEntity>;
    deleteStaff(id: string): Promise<void>;

    // General
    findPermittedPharmacies(ownerId: string): Promise<{ id: string; name: string }[]>;

    // Pharma Sales Rep
    findPharmaRepByEmail(email: string): Promise<any | null>;
    updatePharmaRepOtp(email: string, otp: string, expiresAt: Date): Promise<void>;
    verifyPharmaRepOtp(email: string, otp: string): Promise<any | null>;
}
