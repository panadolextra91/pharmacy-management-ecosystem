export interface CreateCustomerDto {
    phone: string;
    fullName: string;
    address?: string;
    dateOfBirth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    email?: string;
}

export interface CustomerQueryDto {
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateHealthMetricDto {
    weight?: number; // kg
    height?: number; // cm
    bmi?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    bloodSugar?: number;
    note?: string;
}

export interface CreateAllergyDto {
    allergen: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reaction?: string;
}

export interface CreateHealthRecordDto {
    title: string;
    type: 'PRESCRIPTION' | 'LAB_RESULT' | 'DIAGNOSIS' | 'OTHER';
    description?: string;
    fileUrl?: string; // Optional if just text note
}
