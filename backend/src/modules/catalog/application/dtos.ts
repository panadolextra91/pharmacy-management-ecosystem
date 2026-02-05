export interface CreateGlobalMedicineDto {
    name: string;
    manufacturer?: string;
    description?: string;
    packaging?: string;
    activeIngredient?: string;
    barcode?: string;
    unitPrice?: number;
    categoryId?: string;
    brandId?: string;
    supplierId: string;
    pharmaRepId: string;
}

export interface UpdateGlobalMedicineDto {
    name?: string;
    manufacturer?: string;
    description?: string;
    packaging?: string;
    activeIngredient?: string;
    barcode?: string;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
}

export interface GlobalMedicineQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    pharmaRepId?: string;
    sort?: 'price_asc' | 'price_desc' | 'name_asc';
}

export interface PurchaseRequestItemDto {
    catalogItemId: string;
    quantity: number;
}

export interface SendPurchaseRequestDto {
    pharmacyId: string;
    items: PurchaseRequestItemDto[];
}
