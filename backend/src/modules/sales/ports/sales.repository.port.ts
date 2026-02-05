import { PharmacyOrderEntity, PharmacyInvoiceEntity } from '../domain/entities';

export interface ISalesRepository {
    createOrder(data: any, tx?: any): Promise<PharmacyOrderEntity>;
    createInvoice(data: any, tx?: any): Promise<PharmacyInvoiceEntity>;
    findOrderById(id: string, pharmacyId: string): Promise<PharmacyOrderEntity | null>;
    findInvoiceById(id: string, pharmacyId: string): Promise<PharmacyInvoiceEntity | null>;

    // Transaction Support
    executeTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}
