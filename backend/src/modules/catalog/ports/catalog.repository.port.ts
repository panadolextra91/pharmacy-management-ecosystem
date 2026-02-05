import { CatalogItemEntity } from '../domain/entities';

export interface ICatalogRepository {
    create(data: any): Promise<CatalogItemEntity>;
    findAll(query: any): Promise<{ data: CatalogItemEntity[]; total: number }>;
    findById(id: string): Promise<CatalogItemEntity | null>;
    update(id: string, data: any): Promise<CatalogItemEntity>;
    delete(id: string): Promise<void>;

    // Extensions for CSV and Purchase Requests
    findSupplierById(id: string): Promise<any>;
    findPharmaRepById(id: string): Promise<any>;
    findByNameAndSupplier(name: string, supplierId: string): Promise<CatalogItemEntity | null>;
    upsert(data: any): Promise<void>; // Simplified for batch processing
    findAllActivePharmacies(): Promise<{ id: string; name: string }[]>;

    // Purchase Request related
    findPharmacyById(id: string): Promise<any>;
    findManyByIds(ids: string[]): Promise<CatalogItemEntity[]>;
    createPurchaseInvoice(data: any): Promise<{ id: string }>;

    // Catalog Approval Flow
    upsertCategory(name: string): Promise<string>;
    upsertBrand(name: string): Promise<string>;
    findPendingItems(): Promise<CatalogItemEntity[]>;
    approveItems(ids: string[]): Promise<void>;
}
