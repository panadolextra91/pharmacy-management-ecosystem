import * as bcrypt from 'bcrypt';
import prisma from '../../../shared/config/database';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import {
  RegisterOwnerDto,
  LoginOwnerDto,
  RegisterStaffDto,
  LoginStaffDto,
  RegisterCustomerDto,
  LoginCustomerDto,
  AuthResponse,
  TokenPayload,
} from '../types';
import { generateAccessToken, generateRefreshToken } from '../../../shared/utils/jwt';
import { generateOtp, getOtpExpiration } from '../../../shared/utils/otp';

const SALT_ROUNDS = 10;

export class AuthService {
  // Owner Authentication
  async registerOwner(data: RegisterOwnerDto): Promise<AuthResponse> {
    // Check if owner already exists
    const existingOwner = await prisma.owner.findUnique({
      where: { email: data.email },
    });

    if (existingOwner) {
      throw new AppError('Owner with this email already exists', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create owner
    const owner = await prisma.owner.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        phone: data.phone,
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: owner.id,
      email: owner.email,
      role: 'OWNER',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'OWNER',
        },
        accessToken,
        refreshToken,
      },
    };
  }

  async loginOwner(data: LoginOwnerDto): Promise<AuthResponse> {
    // Find owner
    const owner = await prisma.owner.findUnique({
      where: { email: data.email },
    });

    if (!owner) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }

    if (!owner.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, owner.password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: owner.id,
      email: owner.email,
      role: 'OWNER',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'OWNER',
        },
        accessToken,
        refreshToken,
      },
    };
  }

  // Staff Authentication
  async registerStaff(data: RegisterStaffDto, pharmacyId: string): Promise<AuthResponse> {
    // Verify pharmacy exists and user has access
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      throw new AppError('Pharmacy not found', 404, 'NOT_FOUND');
    }

    // Check if staff already exists
    const existingStaff = await prisma.pharmacyStaff.findUnique({
      where: { email: data.email },
    });

    if (existingStaff) {
      throw new AppError('Staff with this email already exists', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create staff
    const staff = await prisma.pharmacyStaff.create({
      data: {
        username: data.username,
        password: hashedPassword,
        name: data.name,
        email: data.email,
        role: data.role,
        pharmacyId: pharmacyId,
      },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      pharmacyId: staff.pharmacyId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          pharmacyId: staff.pharmacyId,
        },
        accessToken,
        refreshToken,
      },
    };
  }

  async loginStaff(data: LoginStaffDto): Promise<AuthResponse> {
    // Find staff
    const staff = await prisma.pharmacyStaff.findUnique({
      where: { email: data.email },
      include: { pharmacy: true },
    });

    if (!staff) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }

    if (!staff.isActive) {
      throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    if (!staff.pharmacy.isActive) {
      throw new AppError('Pharmacy is deactivated', 403, 'PHARMACY_DEACTIVATED');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, staff.password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401, 'AUTH_INVALID');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      pharmacyId: staff.pharmacyId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          pharmacyId: staff.pharmacyId,
        },
        accessToken,
        refreshToken,
      },
    };
  }

  // Customer Authentication
  async registerCustomer(data: RegisterCustomerDto): Promise<AuthResponse> {
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });

    if (existingCustomer) {
      throw new AppError('Customer with this phone number already exists', 409, 'PHONE_EXISTS');
    }

    // Hash password if provided
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, SALT_ROUNDS)
      : null;

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        phone: data.phone,
        password: hashedPassword,
        fullName: data.fullName,
        email: data.email || null,
        registrationSource: data.registrationSource || 'mobile_app',
        verified: false, // Will be verified via OTP
      },
    });

    // Generate tokens (customer will need to verify OTP first)
    const tokenPayload: TokenPayload = {
      id: customer.id,
      phone: customer.phone,
      role: 'CUSTOMER',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: customer.id,
          phone: customer.phone,
          name: customer.fullName || undefined,
          role: 'CUSTOMER',
        },
        accessToken,
        refreshToken,
      },
    };
  }

  async loginCustomer(data: LoginCustomerDto): Promise<AuthResponse> {
    // Find customer
    const customer = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    // If password is provided, verify it
    if (data.password && customer.password) {
      const isValidPassword = await bcrypt.compare(data.password, customer.password);
      if (!isValidPassword) {
        throw new AppError('Invalid password', 401, 'AUTH_INVALID');
      }
    } else if (data.password && !customer.password) {
      // Customer doesn't have password set, needs to set one or use OTP
      throw new AppError('Password not set. Please use OTP login or set a password', 400, 'PASSWORD_NOT_SET');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: customer.id,
      phone: customer.phone,
      role: 'CUSTOMER',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: customer.id,
          phone: customer.phone,
          name: customer.fullName || undefined,
          role: 'CUSTOMER',
        },
        accessToken,
        refreshToken,
      },
    };
  }

  // OTP Management
  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    const otp = generateOtp();
    const expiresAt = getOtpExpiration();

    // Delete old OTPs for this phone
    await prisma.otp.deleteMany({
      where: {
        phone,
        isUsed: false,
      },
    });

    // Create new OTP
    await prisma.otp.create({
      data: {
        phone,
        otp,
        expiresAt,
        isUsed: false,
      },
    });

    // TODO: Send OTP via SMS service
    // For now, we'll just log it (in development)
    console.log(`OTP for ${phone}: ${otp}`);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
    // Find valid OTP
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone,
        otp,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 400, 'INVALID_OTP');
    }

    // Mark OTP as used
    await prisma.otp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      // Create customer if doesn't exist
      customer = await prisma.customer.create({
        data: {
          phone,
          verified: true,
          verifiedAt: new Date(),
          registrationSource: 'mobile_app',
        },
      });
    } else {
      // Update customer as verified
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          verified: true,
          verifiedAt: new Date(),
        },
      });
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      id: customer.id,
      phone: customer.phone,
      role: 'CUSTOMER',
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          id: customer.id,
          phone: customer.phone,
          name: customer.fullName || undefined,
          role: 'CUSTOMER',
        },
        accessToken,
        refreshToken,
      },
    };
  }

  // Refresh Token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { verifyRefreshToken } = await import('../../../shared/utils/jwt');
    
    try {
      const payload = verifyRefreshToken(refreshToken);
      
      // Generate new tokens
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }
}

export default new AuthService();

