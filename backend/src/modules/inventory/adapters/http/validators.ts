import { z } from 'zod';

export const createStorageLocationSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        // pharmacyId is handled by middleware
    }),
});

export const updateStorageLocationSchema = z.object({
    params: z.object({
        id: z.string().cuid(),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

// Unit Schema (used inside CreateInventory)
const unitSchema = z.object({
    name: z.string().min(1, 'Unit name is required'),
    conversionFactor: z.number().int().min(1, 'Conversion factor must be >= 1'),
    price: z.number().min(0, 'Price must be >= 0'),
    isBaseUnit: z.boolean().optional(),
    isDefaultSelling: z.boolean().optional(),
});

export const createInventorySchema = z.object({
    body: z.object({
        globalCatalogId: z.string().uuid().optional(),
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        storageLocationId: z.string().cuid().optional(),
        image: z.string().optional(),
        units: z.array(unitSchema).min(1, 'At least one unit is required'),
    }),
});

export const updateInventorySchema = z.object({
    params: z.object({
        id: z.string().cuid(),
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        brandId: z.string().uuid().optional(),
        storageLocationId: z.string().cuid().optional(),
        minStockLevel: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const queryInventorySchema = z.object({
    query: z.object({
        page: z.string().transform(Number).optional(),
        limit: z.string().transform(Number).optional(),
        search: z.string().optional(),
        categoryId: z.string().optional(),
        storageLocationId: z.string().optional(),
        lowStock: z.string().transform((val) => val === 'true').optional(),
    }),
});

export const addStockSchema = z.object({
    params: z.object({
        id: z.string().cuid(), // inventoryId
    }),
    body: z.object({
        batchNumber: z.string().min(1, 'Batch number is required'),
        expiryDate: z.string().datetime({ message: 'Valid expiry date required' }),
        quantity: z.number().int().min(1, 'Quantity must be positive'),
    }),
});

export const adjustStockSchema = z.object({
    params: z.object({
        id: z.string().cuid(), // inventoryId
        batchId: z.string().cuid(),
    }),
    body: z.object({
        quantity: z.number().int({ message: 'Quantity must be an integer' }), // Negative allowed for deduction
        reason: z.string().optional(),
    }),
});

export const expiryAlertQuerySchema = z.object({
    query: z.object({
        days: z.string().transform(Number).optional(),
    }),
});
