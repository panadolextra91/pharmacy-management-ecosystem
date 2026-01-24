import * as bcrypt from 'bcrypt';
import prisma from '../../../shared/config/database';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import {
    RegisterAdminDto,
    LoginAdminDto,
    AuthResponse,
    TokenPayload,
} from '../types';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../shared/utils/jwt';

const SALT_ROUNDS = 10;

export class AdminAuthService {
    async register(data: RegisterAdminDto): Promise<AuthResponse> {
        // Optional: Check for a secret key or limit registration to only when 0 admins exist
        // For SaaS MVP, let's open it but maybe log it?
        // Or check if admin email overlaps with other users? (Schema enforces unique email per table, not globally, which is fine)

        const existingAdmin = await prisma.systemAdmin.findUnique({
            where: { email: data.email }
        });

        if (existingAdmin) {
            throw new AppError('Admin with this email already exists', 409, 'EMAIL_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

        const admin = await prisma.systemAdmin.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword
            }
        });

        const tokenPayload: TokenPayload = {
            id: admin.id,
            email: admin.email,
            role: 'SYSTEM_ADMIN'
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            success: true,
            data: {
                user: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: 'SYSTEM_ADMIN'
                },
                accessToken,
                refreshToken
            }
        };
    }

    async login(data: LoginAdminDto): Promise<AuthResponse> {
        const admin = await prisma.systemAdmin.findUnique({
            where: { email: data.email }
        });

        if (!admin) {
            throw new AppError('Invalid credentials', 401, 'AUTH_INVALID');
        }

        const isValid = await bcrypt.compare(data.password, admin.password);
        if (!isValid) {
            throw new AppError('Invalid credentials', 401, 'AUTH_INVALID');
        }

        const tokenPayload: TokenPayload = {
            id: admin.id,
            email: admin.email,
            role: 'SYSTEM_ADMIN'
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        return {
            success: true,
            data: {
                user: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: 'SYSTEM_ADMIN'
                },
                accessToken,
                refreshToken
            }
        };
    }

    async refreshToken(token: string) {
        try {
            const payload = verifyRefreshToken(token);
            // Verify admin still exists
            const admin = await prisma.systemAdmin.findUnique({ where: { id: payload.id } });
            if (!admin) throw new AppError('Admin not found', 401, 'AUTH_INVALID');

            const tokenPayload: TokenPayload = {
                id: admin.id,
                email: admin.email,
                role: 'SYSTEM_ADMIN'
            };

            return {
                accessToken: generateAccessToken(tokenPayload),
                refreshToken: generateRefreshToken(tokenPayload)
            };
        } catch (error) {
            throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }
    }
}

export default new AdminAuthService();
