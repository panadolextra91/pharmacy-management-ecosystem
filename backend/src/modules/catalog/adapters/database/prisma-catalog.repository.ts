import prisma from '../../../../shared/config/database';
import { ICatalogRepository } from '../../ports/catalog.repository.port';
import { CatalogItemEntity } from '../../domain/entities';

export class PrismaCatalogRepository implements ICatalogRepository {
    async create(data: any): Promise<CatalogItemEntity> {
        return prisma.globalMedicineCatalog.create({
            data,
            include: { category: true, brand: true, supplier: true, pharmaRep: true }
        }) as unknown as CatalogItemEntity;
    }

    async findAll(query: any): Promise<{ data: CatalogItemEntity[]; total: number }> {
        const { page = 1, limit = 20, search, categoryId, brandId, supplierId, pharmaRepId, sort } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { activeIngredient: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
            ];
        }
        if (categoryId) where.categoryId = categoryId;
        if (brandId) where.brandId = brandId;
        if (supplierId) where.supplierId = supplierId;
        if (pharmaRepId) where.pharmaRepId = pharmaRepId;

        let orderBy: any = { name: 'asc' };
        if (sort === 'price_asc') orderBy = { unitPrice: 'asc' };
        if (sort === 'price_desc') orderBy = { unitPrice: 'desc' };
        if (sort === 'name_asc') orderBy = { name: 'asc' };

        const [total, data] = await Promise.all([
            prisma.globalMedicineCatalog.count({ where }),
            prisma.globalMedicineCatalog.findMany({
                where,
                skip,
                take: limit,
                include: { category: true, brand: true, supplier: true, pharmaRep: true },
                orderBy,
            }),
        ]);

        return { data: data as unknown as CatalogItemEntity[], total };
    }

    async findById(id: string): Promise<CatalogItemEntity | null> {
        return prisma.globalMedicineCatalog.findUnique({
            where: { id },
            include: { category: true, brand: true, supplier: true, pharmaRep: true },
        }) as unknown as CatalogItemEntity;
    }

    async update(id: string, data: any): Promise<CatalogItemEntity> {
        return prisma.globalMedicineCatalog.update({
            where: { id },
            data,
            include: { category: true, brand: true, supplier: true },
        }) as unknown as CatalogItemEntity;
    }

    async delete(id: string): Promise<void> {
        await prisma.globalMedicineCatalog.delete({ where: { id } });
    }

    // Extensions
    async findSupplierById(id: string): Promise<any> {
        return prisma.supplier.findUnique({ where: { id } });
    }

    async findPharmaRepById(id: string): Promise<any> {
        return prisma.pharmaSalesRep.findUnique({ where: { id } });
    }

    async findByNameAndSupplier(name: string, supplierId: string): Promise<CatalogItemEntity | null> {
        return prisma.globalMedicineCatalog.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                supplierId
            }
        }) as unknown as CatalogItemEntity;
    }

    async upsert(data: any): Promise<void> {
        // Simple manual upsert logic supported by repo to match service needs
        // Logic handled in Service usually, but keeping Find then Update/Create here if needed
        // Actually, the Service logic had specific error handling per row.
        // It's better if Repo exposes find and create/update separately (already done above),
        // OR a specific upsert method.
        // Let's implement real upsert using prisma if possible, or manual check.
        const existing = await this.findByNameAndSupplier(data.name, data.supplierId);
        if (existing) {
            await this.update(existing.id, data);
        } else {
            await this.create(data);
        }
    }

    async findAllActivePharmacies(): Promise<{ id: string; name: string }[]> {
        return prisma.pharmacy.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
        });
    }

    // Purchase Request
    async findPharmacyById(id: string): Promise<any> {
        return prisma.pharmacy.findUnique({ where: { id } });
    }

    async findManyByIds(ids: string[]): Promise<CatalogItemEntity[]> {
        return prisma.globalMedicineCatalog.findMany({
            where: { id: { in: ids } },
            include: { pharmaRep: true, supplier: true }
        }) as unknown as CatalogItemEntity[];
    }

    async createPurchaseInvoice(data: any): Promise<{ id: string }> {
        return prisma.purchaseInvoice.create({ data });
    }

    // Catalog Approval Flow
    async upsertCategory(name: string): Promise<string> {
        const category = await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        return category.id;
    }

    async upsertBrand(name: string): Promise<string> {
        const brand = await prisma.brand.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        return brand.id;
    }

    async findPendingItems(): Promise<CatalogItemEntity[]> {
        return prisma.globalMedicineCatalog.findMany({
            where: { status: 'PENDING' },
            include: { category: true, brand: true, supplier: true, pharmaRep: true },
            orderBy: { createdAt: 'desc' }
        }) as unknown as CatalogItemEntity[];
    }

    async approveItems(ids: string[]): Promise<void> {
        await prisma.globalMedicineCatalog.updateMany({
            where: { id: { in: ids } },
            data: { status: 'APPROVED' }
        });
    }
}
