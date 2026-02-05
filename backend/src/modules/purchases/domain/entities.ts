export interface PurchaseInvoiceEntity {
    id: string;
    pharmacyId: string;
    supplierId: string;
    supplierName: string;
    invoiceNumber: string;
    invoiceDate: Date;
    notes?: string | null;
    totalAmount: number; // Decimal in Prisma -> number in DTO/Entity usually, or string/Decimal type
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
    items?: PurchaseItemEntity[];
    supplier?: any;
}

export interface PurchaseItemEntity {
    id: string;
    purchaseInvoiceId: string;
    inventoryId: string;
    batchCode: string;
    expiryDate: Date;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    inventory?: any;
}
