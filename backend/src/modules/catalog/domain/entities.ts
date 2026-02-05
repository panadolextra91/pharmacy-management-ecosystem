export interface CatalogItemEntity {
    id: string;
    name: string;
    manufacturer?: string | null;
    description?: string | null;
    packaging?: string | null;
    activeIngredient?: string | null;
    barcode?: string | null;
    unitPrice?: number | null;
    categoryId?: string | null;
    brandId?: string | null;
    supplierId: string;
    pharmaRepId: string;
    createdAt: Date;
    updatedAt: Date;
    category?: any;
    brand?: any;
    supplier?: any;
    pharmaRep?: any;
}
