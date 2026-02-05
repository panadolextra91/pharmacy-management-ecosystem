export interface InventoryEntity {
    id: string;
    pharmacyId: string;
    globalCatalogId?: string | null;
    name: string;
    description?: string | null;
    image?: string | null;
    categoryId?: string | null;
    brandId?: string | null;
    storageLocationId?: string | null;
    totalStockLevel: number;
    minStockLevel: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    units?: InventoryUnitEntity[];
    batches?: InventoryBatchEntity[];

    // Relations (simplified for domain)
    category?: any;
    brand?: any;
    storageLocation?: any;
}

export interface InventoryUnitEntity {
    id: string;
    inventoryId: string;
    name: string;
    conversionFactor: number;
    price: number; // Decimal in DB, number here
    isBaseUnit: boolean;
    isDefaultSelling: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryBatchEntity {
    id: string;
    inventoryId: string;
    batchCode: string;
    expiryDate: Date;
    stockQuantity: number;
    purchasePrice?: number | null;
    purchaseDate?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Domain Errors
export class InventoryDomainError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'InventoryDomainError';
    }
}
