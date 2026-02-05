export interface OwnerEntity {
    id: string;
    email: string;
    password?: string;
    name: string;
    phone?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface StaffEntity {
    id: string;
    username: string;
    email: string;
    password?: string;
    name: string;
    role: string;
    pharmacyId: string;
    isActive: boolean;
    pharmacy?: {
        id: string;
        name: string;
        isActive: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomerEntity {
    id: string;
    phone: string;
    password?: string | null;
    fullName?: string | null;
    email?: string | null;
    verified: boolean;
    registrationSource: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface OtpEntity {
    id: string;
    phone: string;
    otp: string;
    expiresAt: Date;
    isUsed: boolean;
    createdAt: Date;
}
