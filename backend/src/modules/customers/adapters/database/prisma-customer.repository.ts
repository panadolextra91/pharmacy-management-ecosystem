import prisma from '../../../../shared/config/database';
import { ICustomerRepository } from '../../ports/customer.repository.port';
import { CustomerEntity, CustomerHealthMetricEntity, CustomerAllergyEntity, CustomerHealthRecordEntity } from '../../domain/entities';

export class PrismaCustomerRepository implements ICustomerRepository {
    async findAll(query: any): Promise<{ data: CustomerEntity[]; total: number }> {
        const { search, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where: any = {};
        if (search) {
            where.OR = [
                { phone: { contains: search } },
                { fullName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [data, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { fullName: 'asc' }
            }),
            prisma.customer.count({ where })
        ]);

        return { data: data as unknown as CustomerEntity[], total };
    }

    async findById(id: string): Promise<CustomerEntity | null> {
        return prisma.customer.findUnique({ where: { id } });
    }

    async findByPhone(phone: string): Promise<CustomerEntity | null> {
        return prisma.customer.findUnique({ where: { phone } });
    }

    async create(data: any): Promise<CustomerEntity> {
        return prisma.customer.create({ data });
    }

    async update(id: string, data: any): Promise<CustomerEntity> {
        return prisma.customer.update({ where: { id }, data });
    }

    async findByIdWithOrders(id: string, pharmacyId: string): Promise<CustomerEntity | null> {
        return prisma.customer.findUnique({
            where: { id },
            include: {
                healthMetrics: true,
                allergies: true,
                _count: {
                    select: { orders: { where: { pharmacyId } } }
                }
            }
        }) as unknown as CustomerEntity;
    }

    async findRecentOrders(customerId: string, pharmacyId: string): Promise<any[]> {
        return prisma.pharmacyOrder.findMany({
            where: { customerId, pharmacyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                items: {
                    include: { inventory: { select: { name: true } } }
                }
            }
        });
    }

    async findAllOrders(customerId: string): Promise<any[]> {
        return prisma.pharmacyOrder.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            include: {
                pharmacy: { select: { name: true, phone: true } },
                items: {
                    include: { inventory: { select: { name: true } } }
                }
            }
        });
    }

    async upsertHealthMetric(customerId: string, data: any): Promise<CustomerHealthMetricEntity> {
        return prisma.customerHealthMetrics.upsert({
            where: { customerId },
            create: { customerId, ...data },
            update: { ...data }
        }) as unknown as CustomerHealthMetricEntity;
    }

    async findAllergy(customerId: string, name: string): Promise<CustomerAllergyEntity | null> {
        return prisma.customerAllergy.findFirst({
            where: { customerId, name: { equals: name, mode: 'insensitive' } }
        });
    }

    async createAllergy(data: any): Promise<CustomerAllergyEntity> {
        return prisma.customerAllergy.create({ data });
    }

    async deleteAllergy(id: string): Promise<void> {
        await prisma.customerAllergy.delete({ where: { id } });
    }

    async findAllergyById(id: string, customerId: string): Promise<CustomerAllergyEntity | null> {
        return prisma.customerAllergy.findFirst({ where: { id, customerId } });
    }

    async createHealthRecord(data: any): Promise<CustomerHealthRecordEntity> {
        return prisma.customerHealthRecord.create({ data });
    }

    async deleteHealthRecord(id: string): Promise<void> {
        await prisma.customerHealthRecord.delete({ where: { id } });
    }

    async findHealthRecordById(id: string, customerId: string): Promise<CustomerHealthRecordEntity | null> {
        return prisma.customerHealthRecord.findFirst({ where: { id, customerId } });
    }

    async findDetailedProfile(id: string): Promise<CustomerEntity | null> {
        return prisma.customer.findUnique({
            where: { id },
            include: {
                healthMetrics: true,
                allergies: true,
                healthRecords: true
            }
        }) as unknown as CustomerEntity;
    }
}
