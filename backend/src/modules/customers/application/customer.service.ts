import { ICustomerRepository } from '../ports/customer.repository.port';
import { CreateCustomerDto, CustomerQueryDto, CreateHealthMetricDto, CreateAllergyDto, CreateHealthRecordDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

export class CustomerService {
    constructor(private readonly repository: ICustomerRepository) { }

    // 1. Search Customers (Global)
    async searchCustomers(query: CustomerQueryDto) {
        const result = await this.repository.findAll(query);
        return {
            data: result.data,
            pagination: {
                page: query.page || 1,
                limit: query.limit || 20,
                total: result.total,
                totalPages: Math.ceil(result.total / (query.limit || 20)),
            },
        };
    }

    // 2. Create Customer
    async createCustomer(data: CreateCustomerDto) {
        const existing = await this.repository.findByPhone(data.phone);
        if (existing) throw new AppError('Customer with this phone already exists', 409, 'CUSTOMER_EXISTS');

        const customer = await this.repository.create({
            phone: data.phone,
            fullName: data.fullName,
            address: data.address,
            email: data.email,
            verified: false,
            registrationSource: 'in_store'
        });

        // If health data provided (DOB, Gender), create initial metrics
        if (data.dateOfBirth || data.gender) {
            await this.repository.upsertHealthMetric(customer.id, {
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
                gender: data.gender
            });
        }

        return customer;
    }

    // 3. Get Profile + History (Pharmacy Scoped)
    async getCustomerProfile(id: string, pharmacyId: string) {
        const customer = await this.repository.findByIdWithOrders(id, pharmacyId);
        if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

        const recentOrders = await this.repository.findRecentOrders(id, pharmacyId);

        return {
            ...customer,
            recentOrders
        };
    }

    // 4. Health Management
    async addHealthMetric(customerId: string, data: CreateHealthMetricDto) {
        return await this.repository.upsertHealthMetric(customerId, data);
    }

    async addAllergy(customerId: string, data: CreateAllergyDto) {
        // Prevent duplicate allergy
        const existing = await this.repository.findAllergy(customerId, data.allergen);
        if (existing) throw new AppError('Allergy already recorded', 409, 'DUPLICATE_ALLERGY');

        return await this.repository.createAllergy({
            customerId,
            name: data.allergen,
            description: data.reaction
        });
    }

    async deleteAllergy(customerId: string, allergyId: string) {
        const allergy = await this.repository.findAllergyById(allergyId, customerId);
        if (!allergy) throw new AppError('Allergy not found', 404, 'NOT_FOUND');

        await this.repository.deleteAllergy(allergyId);
    }

    async addHealthRecord(customerId: string, data: CreateHealthRecordDto) {
        return await this.repository.createHealthRecord({
            customerId,
            title: data.title,
            recordType: data.type,
            description: data.description,
            fileUrl: data.fileUrl,
            dateRecorded: new Date()
        });
    }

    async deleteHealthRecord(customerId: string, recordId: string) {
        const record = await this.repository.findHealthRecordById(recordId, customerId);
        if (!record) throw new AppError('Record not found', 404, 'NOT_FOUND');

        await this.repository.deleteHealthRecord(recordId);
    }

    // 5. Portal / Self-Service
    async getMe(customerId: string) {
        const customer = await this.repository.findDetailedProfile(customerId);
        if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
        return customer;
    }

    async updateMe(customerId: string, data: Partial<CreateCustomerDto>) {
        return await this.repository.update(customerId, {
            fullName: data.fullName,
            email: data.email,
        });
    }

    async getGlobalHistory(customerId: string) {
        return await this.repository.findAllOrders(customerId);
    }
}

import { PrismaCustomerRepository } from '../adapters/database/prisma-customer.repository';
export default new CustomerService(new PrismaCustomerRepository());
