import * as bcrypt from 'bcrypt';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import {
    RegisterAdminDto,
    LoginAdminDto,
    AuthResponse,
    TokenPayload,
} from '../application/dtos';
import { generateAccessToken, generateRefreshToken } from '../../../shared/utils/jwt';
import { IAuthRepository } from '../ports/auth.repository.port';

const SALT_ROUNDS = 10;

export class AdminAuthService {
    constructor(private readonly repository: IAuthRepository) { }

    async register(data: RegisterAdminDto): Promise<AuthResponse> {
        const existingAdmin = await this.repository.findAdminByEmail(data.email);

        if (existingAdmin) {
            throw new AppError('Admin with this email already exists', 409, 'EMAIL_EXISTS');
        }

        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

        const admin = await this.repository.createAdmin({
            name: data.name,
            email: data.email,
            password: hashedPassword
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
        const admin = await this.repository.findAdminByEmail(data.email);

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
        const { verifyRefreshToken } = await import('../../../shared/utils/jwt');
        try {
            const payload = verifyRefreshToken(token);
            const admin = await this.repository.findAdminById(payload.id);
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

import { PrismaAuthRepository } from '../adapters/database/prisma-auth.repository';
export default new AdminAuthService(new PrismaAuthRepository());
