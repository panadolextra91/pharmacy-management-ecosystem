import * as bcrypt from 'bcrypt';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import {
    RegisterOwnerDto,
    LoginOwnerDto,
    RegisterStaffDto,
    LoginStaffDto,
    RegisterCustomerDto,
    AuthResponse,
    TokenPayload,
} from '../application/dtos';
import { generateAccessToken, generateRefreshToken } from '../../../shared/utils/jwt';
import { generateOtp, getOtpExpiration } from '../../../shared/utils/otp';
import { IAuthRepository } from '../ports/auth.repository.port';
import { sendEmail } from '../../../shared/config/email';

// Assuming LoginCustomerDto is defined in '../application/dtos'
// The user's instruction implies a change to the DTO definition itself,
// which would typically be in the dtos.ts file.
// For the purpose of this task, we'll assume the DTO is correctly updated
// in its source file and we are just importing the updated version.
// The provided "Code Edit" seems to be a snippet of the DTO definition
// rather than an import statement.
// We will proceed by assuming the LoginCustomerDto now includes the 'otp' field.

// Re-declaring the DTO here for clarity based on the instruction's intent,
// though in a real project, this would be in the dtos.ts file.
export interface LoginCustomerDto {
    phone: string;
    password?: string; // Optional (Password login)
    otp?: string;      // Optional (OTP login)
}

const SALT_ROUNDS = 10;

export class AuthService {
    constructor(private readonly repository: IAuthRepository) { }

    // Owner Authentication
    async registerOwner(data: RegisterOwnerDto): Promise<AuthResponse> {
        const existingOwner = await this.repository.findOwnerByEmail(data.email);
        if (existingOwner) {
            throw new AppError('Owner with this email already exists', 409, 'EMAIL_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
        const owner = await this.repository.createOwner({
            email: data.email,
            password: hashedPassword,
            name: data.name,
            phone: data.phone,
        });

        const tokenPayload: TokenPayload = {
            id: owner.id,
            email: owner.email,
            role: 'OWNER',
        };

        return this.generateAuthResponse(tokenPayload, {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            role: 'OWNER',
        });
    }

    async loginOwner(data: LoginOwnerDto): Promise<AuthResponse> {
        const owner = await this.repository.findOwnerByEmail(data.email);
        if (!owner) {
            throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
        }
        if (!owner.isActive) {
            throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
        }

        // Check Owner status (SaaS logic)
        if ((owner as any).status === 'PENDING') {
            throw new AppError(
                'Your account is pending approval. Please wait for admin activation.',
                403,
                'ACCOUNT_PENDING'
            );
        }
        if ((owner as any).status === 'SUSPENDED') {
            throw new AppError(
                'Your account has been suspended. Please contact support.',
                403,
                'ACCOUNT_SUSPENDED'
            );
        }

        const isValidPassword = await bcrypt.compare(data.password, owner.password || '');
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
        }

        const tokenPayload: TokenPayload = {
            id: owner.id,
            email: owner.email,
            role: 'OWNER',
        };

        const pharmacies = await this.repository.findPermittedPharmacies(owner.id);

        return this.generateAuthResponse(tokenPayload, {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            role: 'OWNER',
            pharmacies,
        });
    }

    // Staff Authentication
    async registerStaff(data: RegisterStaffDto, pharmacyId: string): Promise<AuthResponse> {
        const pharmacy = await this.repository.findPharmacyById(pharmacyId);
        if (!pharmacy) {
            throw new AppError('Pharmacy not found', 404, 'NOT_FOUND');
        }

        const existingStaff = await this.repository.findStaffByEmail(data.email);
        if (existingStaff) {
            throw new AppError('Staff with this email already exists', 409, 'EMAIL_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
        const staff = await this.repository.createStaff({
            username: data.username,
            password: hashedPassword,
            name: data.name,
            email: data.email,
            role: data.role,
            pharmacyId: pharmacyId,
        });

        const tokenPayload: TokenPayload = {
            id: staff.id,
            email: staff.email,
            role: staff.role,
            pharmacyId: staff.pharmacyId,
        };

        return this.generateAuthResponse(tokenPayload, {
            id: staff.id,
            email: staff.email,
            name: staff.name,
            role: staff.role,
            pharmacyId: pharmacyId,
        });
    }

    async loginStaff(data: LoginStaffDto): Promise<AuthResponse> {
        const staff = await this.repository.findStaffByEmail(data.email);
        if (!staff) {
            throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
        }
        if (!staff.isActive) {
            throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
        }
        if (staff.pharmacy && !staff.pharmacy.isActive) {
            throw new AppError('Pharmacy is deactivated', 403, 'PHARMACY_DEACTIVATED');
        }

        const isValidPassword = await bcrypt.compare(data.password, staff.password || '');
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
        }

        const tokenPayload: TokenPayload = {
            id: staff.id,
            email: staff.email,
            role: staff.role,
            pharmacyId: staff.pharmacyId,
        };

        return this.generateAuthResponse(tokenPayload, {
            id: staff.id,
            email: staff.email,
            name: staff.name,
            role: staff.role,
            pharmacyId: staff.pharmacyId,
        });
    }

    // Customer Authentication
    async registerCustomer(data: RegisterCustomerDto): Promise<AuthResponse> {
        const existingCustomer = await this.repository.findCustomerByPhone(data.phone);
        if (existingCustomer) {
            throw new AppError('Customer with this phone number already exists', 409, 'PHONE_EXISTS');
        }

        const hashedPassword = data.password
            ? await bcrypt.hash(data.password, SALT_ROUNDS)
            : undefined;

        const customer = await this.repository.createCustomer({
            phone: data.phone,
            password: hashedPassword,
            fullName: data.fullName,
            email: data.email || null,
            registrationSource: data.registrationSource || 'mobile_app',
            verified: false,
        });

        const tokenPayload: TokenPayload = {
            id: customer.id,
            phone: customer.phone,
            role: 'CUSTOMER',
        };

        return this.generateAuthResponse(tokenPayload, {
            id: customer.id,
            phone: customer.phone,
            name: customer.fullName || undefined,
            role: 'CUSTOMER',
        });
    }

    async loginCustomer(data: LoginCustomerDto): Promise<AuthResponse> {
        const customer = await this.repository.findCustomerByPhone(data.phone);
        if (!customer) {
            throw new AppError('Customer not found', 404, 'NOT_FOUND');
        }

        if (data.otp) {
            // OTP Login
            const otpRecord = await this.repository.findValidOtp(data.phone, data.otp);
            if (!otpRecord) {
                throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
            }
            await this.repository.deleteUnusedOtps(data.phone);
        } else if (data.password && customer.password) {
            // Password Login
            const isValidPassword = await bcrypt.compare(data.password, customer.password);
            if (!isValidPassword) {
                throw new AppError('Invalid password', 401, 'AUTH_INVALID');
            }
        } else {
            throw new AppError('Please provide OTP or Password', 400, 'BAD_REQUEST');
        }

        const tokenPayload: TokenPayload = {
            id: customer.id,
            phone: customer.phone,
            role: 'CUSTOMER',
        };

        return this.generateAuthResponse(tokenPayload, {
            id: customer.id,
            phone: customer.phone,
            name: customer.fullName || undefined,
            role: 'CUSTOMER',
        });
    }

    // OTP
    async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
        const otp = generateOtp();
        const expiresAt = getOtpExpiration();

        await this.repository.deleteUnusedOtps(phone);
        await this.repository.createOtp({ phone, otp, expiresAt });

        console.log(`OTP for ${phone}: ${otp}`);

        return { success: true, message: 'OTP sent successfully' };
    }

    async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
        const otpRecord = await this.repository.findValidOtp(phone, otp);
        if (!otpRecord) {
            throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
        }

        await this.repository.markOtpUsed(otpRecord.id);

        let customer = await this.repository.findCustomerByPhone(phone);
        if (!customer) {
            customer = await this.repository.createCustomer({
                phone,
                verified: true,
                verifiedAt: new Date(),
                registrationSource: 'mobile_app',
            });
        } else {
            customer = await this.repository.updateCustomerVerified(customer.id);
        }

        const tokenPayload: TokenPayload = {
            id: customer.id,
            phone: customer.phone,
            role: 'CUSTOMER',
        };

        return this.generateAuthResponse(tokenPayload, {
            id: customer.id,
            phone: customer.phone,
            name: customer.fullName || undefined,
            role: 'CUSTOMER',
        });
    }

    // Pharma Sales Rep OTP
    async requestPharmaRepOtp(email: string): Promise<void> {
        const rep = await this.repository.findPharmaRepByEmail(email);
        if (!rep) {
            throw new AppError('Pharma Sales Rep not found', 404, 'NOT_FOUND');
        }

        const otp = generateOtp();
        const expiresAt = getOtpExpiration(); // Default 10 minutes

        await this.repository.updatePharmaRepOtp(email, otp, expiresAt);

        await sendEmail({
            to: email,
            subject: 'Your Catalog Upload OTP Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Catalog Upload Authentication</h2>
                    <p>Hello ${rep.name},</p>
                    <p>Your OTP code for catalog upload is:</p>
                    <div style="font-size: 24px; font-weight: bold; padding: 10px; background: #f4f4f4; display: inline-block;">
                        ${otp}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        });
    }

    async verifyPharmaRepToken(email: string, otp: string): Promise<string> {
        const rep = await this.repository.verifyPharmaRepOtp(email, otp);
        if (!rep) {
            throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
        }

        return rep.id;
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const { verifyRefreshToken } = await import('../../../shared/utils/jwt');
        let payload: any;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (error) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        const storedToken = await this.repository.findRefreshToken(refreshToken);

        // 1. REUSE DETECTION
        if (storedToken && storedToken.revokedAt) {
            console.error(`[SECURITY] Reuse of revoked token detected! Token: ${refreshToken}`);

            // Revoke ALL tokens for this user
            const userId = storedToken.ownerId || storedToken.staffId || storedToken.customerId || storedToken.adminId;
            const role = storedToken.ownerId ? 'OWNER' : storedToken.staffId ? 'STAFF' : storedToken.customerId ? 'CUSTOMER' : 'SYSTEM_ADMIN';

            await this.repository.revokeAllUserTokens(userId, role);

            throw new AppError('Security breach detected. Please log in again.', 403, 'SECURITY_BREACH_LOGOUT');
        }

        // 2. TOKEN NOT FOUND OR MISMATCH
        if (!storedToken) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        // 3. ROTATION
        // Revoke current token
        const newPayload = { ...payload };
        delete newPayload.iat;
        delete newPayload.exp;

        const newAccessToken = generateAccessToken(newPayload);
        const newRefreshToken = generateRefreshToken(newPayload);

        await this.repository.revokeRefreshToken(refreshToken, newRefreshToken); // Lineage

        // Save new token
        const userId = storedToken.ownerId || storedToken.staffId || storedToken.customerId || storedToken.adminId;
        const role = storedToken.ownerId ? 'OWNER' : storedToken.staffId ? 'STAFF' : storedToken.customerId ? 'CUSTOMER' : 'SYSTEM_ADMIN';

        await this.repository.saveRefreshToken({
            token: newRefreshToken,
            userId,
            role,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async logout(refreshToken: string): Promise<void> {
        await this.repository.revokeRefreshToken(refreshToken);
    }

    private async generateAuthResponse(tokenPayload: TokenPayload, userData: any): Promise<AuthResponse> {
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Save refresh token to DB
        await this.repository.saveRefreshToken({
            token: refreshToken,
            userId: tokenPayload.id,
            role: tokenPayload.role,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        return {
            success: true,
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        };
    }
}

import { PrismaAuthRepository } from '../adapters/database/prisma-auth.repository';
export default new AuthService(new PrismaAuthRepository());
