export interface CreatePurchaseItemDto {
    inventoryId: string;
    batchCode: string;
    expiryDate: string; // ISO Date string
    quantity: number;
    unitPrice: number;
}

export interface CreatePurchaseInvoiceDto {
    supplierId?: string;
    supplierName?: string;
    invoiceNumber: string;
    invoiceDate: string; // ISO Date string
    notes?: string;
    items: CreatePurchaseItemDto[];
}

export interface UpdatePurchaseStatusDto {
    status: 'CONFIRMED' | 'CANCELLED';
}

export interface PurchaseQueryDto {
    page?: number;
    limit?: number;
    pharmacyId?: string;
    startDate?: string;
    endDate?: string;
    supplierId?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}
