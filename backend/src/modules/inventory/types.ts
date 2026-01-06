export interface CreateStorageLocationDto {
    name: string;
    description?: string;
    pharmacyId: string; // Extracted from auth/middleware
}

export interface UpdateStorageLocationDto {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export interface StorageLocationQueryDto {
    pharmacyId: string;
}

// Inventory Units
export interface CreateInventoryUnitDto {
    name: string;
    conversionFactor: number;
    price: number;
    isBaseUnit?: boolean;
    isDefaultSelling?: boolean;
}

export interface UpdateInventoryUnitDto {
    name?: string;
    conversionFactor?: number;
    price?: number;
    isDefaultSelling?: boolean;
}

// Inventory Items
export interface CreateInventoryDto {
    pharmacyId: string; // From middleware
    globalCatalogId?: string; // If importing

    // Overrides or new item
    name: string;
    description?: string;
    categoryId?: string;
    brandId?: string;
    storageLocationId?: string;
    image?: string;

    // Initial Units
    units: CreateInventoryUnitDto[];
}

export interface UpdateInventoryDto {
    name?: string;
    description?: string;
    categoryId?: string;
    brandId?: string;
    storageLocationId?: string;
    isActive?: boolean;
}

export interface InventoryQueryDto {
    pharmacyId: string;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    storageLocationId?: string;
    lowStock?: boolean;
}

// Batch & Stock Management
export interface AddStockDto {
    batchNumber: string;
    expiryDate: string; // ISO Date
    quantity: number; // Base unit quantity
}

export interface AdjustStockDto {
    quantity: number; // + or - adjustment
    reason?: string;
}

export interface ExpiryAlertQueryDto {
    pharmacyId: string;
    days?: number; // Default 30
}
