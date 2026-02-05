import { z } from 'zod';

export const createPurchaseItemSchema = z.object({
    inventoryId: z.string().cuid(),
    batchCode: z.string().min(1, "Batch code is required"),
    expiryDate: z.string().datetime(),
    quantity: z.number().int().positive("Quantity must be positive"),
    unitPrice: z.number().positive("Unit price must be positive"),
});

export const createPurchaseInvoiceSchema = z.object({
    supplierId: z.string().cuid().optional(),
    supplierName: z.string().optional(),
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    invoiceDate: z.string().datetime(),
    notes: z.string().optional(),
    items: z.array(createPurchaseItemSchema).min(1, "At least one item is required"),
}).refine(data => data.supplierId || data.supplierName, {
    message: "Either supplierId or supplierName must be provided",
    path: ["supplierName"],
});

export const updatePurchaseStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED']),
});

export const purchaseQuerySchema = z.object({
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    supplierId: z.string().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
});
