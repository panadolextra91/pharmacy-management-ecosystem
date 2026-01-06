import { z } from 'zod';

export const createGlobalMedicineSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        manufacturer: z.string().optional(),
        description: z.string().optional(),
        packaging: z.string().optional(),
        activeIngredient: z.string().optional(),
        barcode: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        supplierId: z.string().uuid({ message: 'Valid Supplier ID is required' }),
        pharmaRepId: z.string().cuid({ message: 'Pharma Rep ID is required' }),
    }),
});

export const updateGlobalMedicineSchema = z.object({
    params: z.object({
        id: z.string().cuid(),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        manufacturer: z.string().optional(),
        description: z.string().optional(),
        packaging: z.string().optional(),
        activeIngredient: z.string().optional(),
        barcode: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
    }),
});

export const queryGlobalMedicineSchema = z.object({
    query: z.object({
        page: z.string().transform(Number).optional(),
        limit: z.string().transform(Number).optional(),
        search: z.string().optional(),
        categoryId: z.string().optional(),
        brandId: z.string().optional(),
        supplierId: z.string().optional(),
    }),
});
