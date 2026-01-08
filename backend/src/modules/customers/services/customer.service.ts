import prisma from '../../../shared/config/database';
import {
    CreateCustomerDto, CustomerQueryDto,
    CreateHealthMetricDto, CreateAllergyDto, CreateHealthRecordDto
} from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class CustomerService {
    // 1. Search Customers (Global)
    async searchCustomers(query: CustomerQueryDto) {
        const { search, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { phone: { contains: search } },
                { fullName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fullName: 'asc' }
            }),
            prisma.customer.count({ where })
        ]);

        return {
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 2. Create Customer
    async createCustomer(data: CreateCustomerDto) {
        const existing = await prisma.customer.findUnique({
            where: { phone: data.phone }
        });

        if (existing) throw new AppError('Customer with this phone already exists', 409, 'CUSTOMER_EXISTS');

        const customer = await prisma.customer.create({
            data: {
                phone: data.phone,
                fullName: data.fullName,
                address: data.address,
                // dateOfBirth: data.dateOfBirth, // Not in Customer model
                // gender: data.gender, // Not in Customer model
                email: data.email,
                verified: false,
                registrationSource: 'in_store'
            }
        });

        // If health data provided (DOB, Gender), create initial metrics
        if (data.dateOfBirth || data.gender) {
            await prisma.customerHealthMetrics.create({
                data: {
                    customerId: customer.id,
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
                    gender: data.gender
                }
            });
        }

        return customer;
    }

    // 3. Get Profile + History (Pharmacy Scoped)
    async getCustomerProfile(id: string, pharmacyId: string) {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                healthMetrics: true,
                allergies: true,
                _count: {
                    select: { orders: { where: { pharmacyId } } } // Count orders at THIS pharmacy
                }
            }
        });

        if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

        // Fetch recent orders manually to limit/sort
        const recentOrders = await prisma.pharmacyOrder.findMany({
            where: { customerId: id, pharmacyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                items: {
                    include: { inventory: { select: { name: true } } }
                }
            }
        });

        return {
            ...customer,
            recentOrders
        };
    }

    // 4. Health Management
    // 4. Health Management
    async addHealthMetric(customerId: string, data: CreateHealthMetricDto) {
        return await prisma.customerHealthMetrics.upsert({
            where: { customerId },
            create: {
                customerId,
                ...data
            },
            update: {
                ...data
            }
        });
    }

    async addAllergy(customerId: string, data: CreateAllergyDto) {
        // Prevent duplicate allergy
        const existing = await prisma.customerAllergy.findFirst({
            where: { customerId, name: { equals: data.allergen, mode: 'insensitive' } }
        });

        if (existing) throw new AppError('Allergy already recorded', 409, 'DUPLICATE_ALLERGY');

        return await prisma.customerAllergy.create({
            data: {
                customerId,
                name: data.allergen,
                description: data.reaction
            }
        });
    }

    async deleteAllergy(customerId: string, allergyId: string) {
        const allergy = await prisma.customerAllergy.findFirst({
            where: { id: allergyId, customerId }
        });
        if (!allergy) throw new AppError('Allergy not found', 404, 'NOT_FOUND');

        return await prisma.customerAllergy.delete({
            where: { id: allergyId }
        });
    }

    async addHealthRecord(customerId: string, data: CreateHealthRecordDto) {
        return await prisma.customerHealthRecord.create({
            data: {
                customerId,
                title: data.title,
                recordType: data.type,
                description: data.description,
                fileUrl: data.fileUrl,
                dateRecorded: new Date()
            }
        });
    }

    async deleteHealthRecord(customerId: string, recordId: string) {
        const record = await prisma.customerHealthRecord.findFirst({
            where: { id: recordId, customerId }
        });
        if (!record) throw new AppError('Record not found', 404, 'NOT_FOUND');

        return await prisma.customerHealthRecord.delete({
            where: { id: recordId }
        });
    }
    // 5. Portal / Self-Service
    async getMe(customerId: string) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                healthMetrics: true,
                allergies: true,
                healthRecords: true
            }
        });
        if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');
        return customer;
    }

    async updateMe(customerId: string, data: Partial<CreateCustomerDto>) {
        return await prisma.customer.update({
            where: { id: customerId },
            data: {
                fullName: data.fullName,
                email: data.email,
                // Do not allow phone updates easily as it's the ID
                // address, gender, dob ignored here as per previous logic, or can be added if needed
            }
        });
    }

    async getGlobalHistory(customerId: string) {
        // Fetch ALL orders for this customer across ALL pharmacies
        return await prisma.pharmacyOrder.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            include: {
                pharmacy: { select: { name: true, phone: true } }, // Show where they bought it
                items: {
                    include: { inventory: { select: { name: true } } }
                }
            }
        });
    }
}

export default new CustomerService();
