import { CustomerEntity, CustomerHealthMetricEntity, CustomerAllergyEntity, CustomerHealthRecordEntity } from '../domain/entities';

export interface ICustomerRepository {
    // Basic Customer Ops
    findAll(query: any): Promise<{ data: CustomerEntity[]; total: number }>;
    findById(id: string): Promise<CustomerEntity | null>;
    findByPhone(phone: string): Promise<CustomerEntity | null>;
    create(data: any): Promise<CustomerEntity>;
    update(id: string, data: any): Promise<CustomerEntity>;

    // Scoped Ops
    findByIdWithOrders(id: string, pharmacyId: string): Promise<CustomerEntity | null>;
    findRecentOrders(customerId: string, pharmacyId: string): Promise<any[]>;
    findAllOrders(customerId: string): Promise<any[]>;

    // Health Metrics
    upsertHealthMetric(customerId: string, data: any): Promise<CustomerHealthMetricEntity>;

    // Allergies
    findAllergy(customerId: string, name: string): Promise<CustomerAllergyEntity | null>;
    createAllergy(data: any): Promise<CustomerAllergyEntity>;
    deleteAllergy(id: string): Promise<void>;
    findAllergyById(id: string, customerId: string): Promise<CustomerAllergyEntity | null>;

    // Health Records
    createHealthRecord(data: any): Promise<CustomerHealthRecordEntity>;
    deleteHealthRecord(id: string): Promise<void>;
    findHealthRecordById(id: string, customerId: string): Promise<CustomerHealthRecordEntity | null>;

    // Profile
    findDetailedProfile(id: string): Promise<CustomerEntity | null>;
}
