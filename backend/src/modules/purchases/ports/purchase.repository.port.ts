import { PurchaseInvoiceEntity } from '../domain/entities';

export interface IPurchaseRepository {
    create(data: any): Promise<PurchaseInvoiceEntity>;
    findAll(query: any): Promise<{ data: PurchaseInvoiceEntity[]; total: number }>;
    findById(id: string, pharmacyId: string): Promise<PurchaseInvoiceEntity | null>;
    updateStatus(id: string, status: string, tx?: any): Promise<PurchaseInvoiceEntity>;

    // Transaction Executor
    executeTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}
