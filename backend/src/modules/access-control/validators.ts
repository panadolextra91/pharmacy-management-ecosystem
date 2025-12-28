import { z } from 'zod';

export const registerOwnerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
  }),
});

export const loginOwnerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerStaffSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    role: z.enum(['MANAGER', 'PHARMACIST', 'STAFF'], {
      errorMap: () => ({ message: 'Role must be MANAGER, PHARMACIST, or STAFF' }),
    }),
    pharmacyId: z.string().min(1, 'Pharmacy ID is required'),
  }),
});

export const loginStaffSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerCustomerSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    password: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    registrationSource: z.enum(['mobile_app', 'in_store']).optional(),
  }),
});

export const loginCustomerSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    password: z.string().optional(),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

