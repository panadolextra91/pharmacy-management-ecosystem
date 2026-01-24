export interface RegisterOwnerDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginOwnerDto {
  email: string;
  password: string;
}

export interface RegisterStaffDto {
  username: string;
  password: string;
  name: string;
  email: string;
  role: 'MANAGER' | 'PHARMACIST' | 'STAFF';
  pharmacyId: string;
}

export interface LoginStaffDto {
  email: string;
  password: string;
}

export interface RegisterCustomerDto {
  phone: string;
  password?: string;
  fullName?: string;
  email?: string;
  registrationSource?: 'mobile_app' | 'in_store';
}

export interface LoginCustomerDto {
  phone: string;
  password?: string; // Optional for OTP-based login
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface SendOtpDto {
  phone: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email?: string;
      phone?: string;
      name?: string;
      role?: string;
      pharmacyId?: string;
      pharmacies?: any[];
    };
    accessToken: string;
    refreshToken: string;
  };
}

export interface TokenPayload {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  pharmacyId?: string;
}

export interface RegisterAdminDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginAdminDto {
  email: string;
  password: string;
}

export interface AdminResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      role: 'SYSTEM_ADMIN';
    };
    accessToken: string;
    refreshToken: string;
  };
}

