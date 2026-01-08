import { z } from 'zod';

export const createCustomerSchema = z.object({
    body: z.object({
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
        fullName: z.string().min(2, 'Name is required'),
        address: z.string().optional(),
        dateOfBirth: z.string().optional(), // ISO String preferred
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        email: z.string().email().optional().or(z.literal('')),
    }),
});

export const createHealthMetricSchema = z.object({
    body: z.object({
        weight: z.number().positive().optional(),
        height: z.number().positive().optional(),
        bmi: z.number().positive().optional(),
        bloodPressureSystolic: z.number().positive().optional(),
        bloodPressureDiastolic: z.number().positive().optional(),
        heartRate: z.number().positive().int().optional(),
        bloodSugar: z.number().positive().optional(),
        note: z.string().optional(),
    }),
});

export const createAllergySchema = z.object({
    body: z.object({
        allergen: z.string().min(1, 'Allergen name is required'),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        reaction: z.string().optional(),
    }),
});

export const createHealthRecordSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        type: z.enum(['PRESCRIPTION', 'LAB_RESULT', 'DIAGNOSIS', 'OTHER']),
        description: z.string().optional(),
        fileUrl: z.string().url().optional(),
    }),
});
