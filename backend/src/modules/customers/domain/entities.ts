export interface CustomerEntity {
    id: string;
    phone: string;
    fullName?: string | null;
    email?: string | null;
    address?: string | null;
    verified: boolean;
    registrationSource: string | null;
    createdAt: Date;
    updatedAt: Date;
    healthMetrics?: any[];
    allergies?: any[];
    healthRecords?: any[];
    _count?: { orders: number };
}

export interface CustomerHealthMetricEntity {
    id: string;
    customerId: string;
    dateOfBirth?: Date | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    bloodPressure?: string | null;
    bloodSugar?: number | null;
    updatedAt: Date;
}

export interface CustomerAllergyEntity {
    id: string;
    customerId: string;
    name: string;
    description?: string | null;
    severity?: string | null;
    createdAt: Date;
}

export interface CustomerHealthRecordEntity {
    id: string;
    customerId: string;
    title: string;
    recordType: string;
    description?: string | null;
    fileUrl?: string | null;
    dateRecorded: Date;
    createdAt: Date;
}
