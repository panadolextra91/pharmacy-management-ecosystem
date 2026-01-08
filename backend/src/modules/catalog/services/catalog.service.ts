import prisma from '../../../shared/config/database';
import { CreateGlobalMedicineDto, UpdateGlobalMedicineDto, GlobalMedicineQueryDto, SendPurchaseRequestDto } from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class CatalogService {
    async create(data: CreateGlobalMedicineDto) {
        // Verify supplier and pharma rep exist
        const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

        const pharmaRep = await prisma.pharmaSalesRep.findUnique({ where: { id: data.pharmaRepId } });
        if (!pharmaRep) throw new AppError('Pharma Rep not found', 404, 'NOT_FOUND');

        return prisma.globalMedicineCatalog.create({
            data: {
                name: data.name,
                manufacturer: data.manufacturer,
                description: data.description,
                packaging: data.packaging,
                activeIngredient: data.activeIngredient,
                barcode: data.barcode,
                categoryId: data.categoryId,
                brandId: data.brandId,
                supplierId: data.supplierId,
                pharmaRepId: data.pharmaRepId,
            },
            include: {
                category: true,
                brand: true,
                supplier: true,
                pharmaRep: true,
            },
        });
    }

    async findAll(query: GlobalMedicineQueryDto) {
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
                include: {
                    category: true,
                    brand: true,
                    supplier: true,
                    pharmaRep: true,
                },
                orderBy,
            }),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string) {
        const medicine = await prisma.globalMedicineCatalog.findUnique({
            where: { id },
            include: {
                category: true,
                brand: true,
                supplier: true,
                pharmaRep: true,
            },
        });

        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');
        return medicine;
    }

    async update(id: string, data: UpdateGlobalMedicineDto) {
        const medicine = await prisma.globalMedicineCatalog.findUnique({ where: { id } });
        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');

        return prisma.globalMedicineCatalog.update({
            where: { id },
            data,
            include: {
                category: true,
                brand: true,
                supplier: true,
            },
        });
    }

    async delete(id: string) {
        const medicine = await prisma.globalMedicineCatalog.findUnique({ where: { id } });
        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');

        await prisma.globalMedicineCatalog.delete({ where: { id } });
        return { message: 'Medicine deleted successfully' };
    }

    async processCatalogCsv(buffer: Buffer, supplierId: string, pharmaRepId: string) {
        const results: any[] = [];
        const Readable = require('stream').Readable;
        const csv = require('csv-parser');

        const stream = Readable.from(buffer.toString());

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data: any) => results.push(data))
                .on('end', async () => {
                    try {
                        let successCount = 0;
                        let errors: any[] = [];

                        for (const row of results) {
                            // Validate required fields
                            if (!row.name) {
                                errors.push({ row, error: 'Missing name' });
                                continue;
                            }

                            // Upsert logic
                            try {
                                // Try to find by Manufacturer + Name + Supplier to avoid duplicates
                                // Or strict barcode if available
                                const data = {
                                    name: row.name,
                                    manufacturer: row.manufacturer,
                                    description: row.description,
                                    packaging: row.packaging,
                                    activeIngredient: row.activeIngredient,
                                    barcode: row.barcode,
                                    unitPrice: row.unitPrice ? parseFloat(row.unitPrice) : undefined,
                                    supplierId,
                                    pharmaRepId,
                                };

                                // Simple logic: Check existence by name & supplier
                                const existing = await prisma.globalMedicineCatalog.findFirst({
                                    where: {
                                        name: { equals: row.name, mode: 'insensitive' },
                                        supplierId
                                    }
                                });

                                if (existing) {
                                    await prisma.globalMedicineCatalog.update({
                                        where: { id: existing.id },
                                        data
                                    });
                                } else {
                                    await prisma.globalMedicineCatalog.create({ data });
                                }
                                successCount++;
                            } catch (err: any) {
                                errors.push({ row, error: err.message });
                            }
                        }
                    }

                        // Notify all pharmacies if new items were added/updated
                        if (successCount > 0) {
                        import('../../notifications/services/staff-notification.service').then(async (service) => {
                            // Fetch all active pharmacies
                            const pharmacies = await prisma.pharmacy.findMany({
                                where: { isActive: true },
                                select: { id: true }
                            });

                            for (const ph of pharmacies) {
                                // Broadcast to Owner & Managers
                                service.default.notifyPharmacy(
                                    ph.id,
                                    'CATALOG_IMPORTED',
                                    'New Catalog Available',
                                    `A new catalog has been imported (Supplier: ${supplierId}). ${successCount} items processed.`,
                                    { supplierId, pharmaRepId, count: successCount },
                                    ['OWNER', 'MANAGER']
                                );
                            }
                        }).catch(err => console.error('Failed to notify catalog import', err));
                    }

                    resolve({ successCount, errorCount: errors.length, errors });
                } catch (error) {
                    reject(error);
                }
        })
            .on('error', (error: any) => reject(error));
    });
}

    async sendPurchaseRequest(data: SendPurchaseRequestDto) {
    const { pharmacyId, items } = data;

    // 1. Fetch pharmacy details (for email context)
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new AppError('Pharmacy not found', 404, 'NOT_FOUND');

    // 2. Fetch all selected catalog items
    const itemIds = items.map((i: any) => i.catalogItemId);
    const catalogItems = await prisma.globalMedicineCatalog.findMany({
        where: { id: { in: itemIds } },
        include: {
            pharmaRep: true,
            supplier: true
        }
    });

    if (catalogItems.length !== items.length) {
        throw new AppError('Some items not found in catalog', 400, 'BAD_REQUEST');
    }

    // 3. Group items by Pharma Rep
    const itemsByRep = new Map<string, { rep: any, items: any[] }>();

    for (const item of items) {
        const catalogItem = catalogItems.find(c => c.id === item.catalogItemId);
        if (!catalogItem) continue;

        const repId = catalogItem.pharmaRepId;
        if (!itemsByRep.has(repId)) {
            itemsByRep.set(repId, { rep: catalogItem.pharmaRep, items: [] });
        }

        itemsByRep.get(repId)?.items.push({
            ...catalogItem,
            quantity: item.quantity,
            lineTotal: (Number(catalogItem.unitPrice?.toString()) || 0) * item.quantity
        });
    }

    const results = [];
    const { sendEmail } = require('../../../shared/config/email');

    // 4. Process each Rep (Create Invoice + Send Email)
    for (const group of itemsByRep.values()) {
        const { rep, items: repItems } = group;
        const totalAmount = repItems.reduce((sum, item) => sum + item.lineTotal, 0);

        // A. Create PENDING Purchase Invoice
        const createdInvoice = await prisma.purchaseInvoice.create({
            data: {
                pharmacyId,
                supplierId: repItems[0].supplierId,
                supplierName: repItems[0].supplier?.name || "Unknown Supplier",
                invoiceNumber: `REQ-${Date.now().toString().slice(-6)}`,
                invoiceDate: new Date(),
                status: 'PENDING',
                totalAmount,
                notes: `Purchase Request via Email to ${rep.name}.\nItems:\n${repItems.map((i: any) => `- ${i.name} x${i.quantity} (Example Price: ${i.unitPrice})`).join('\n')}`
            }
        });


        // B. Send Email
        if (rep.email) {
            const htmlContent = `
                    <h3>Purchase Request from ${pharmacy.name}</h3>
                    <p>Dear ${rep.name},</p>
                    <p>We would like to order the following items:</p>
                    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th>Item</th>
                                <th>Packaging</th>
                                <th>Quantity</th>
                                <th>Ref. Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${repItems.map((item: any) => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.packaging || '-'}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.unitPrice || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <p>Please confirm availability and delivery date.</p>
                    <br/>
                    <p>Best regards,<br/>${pharmacy.name}</p>
                `;

            await sendEmail({
                to: rep.email,
                subject: `Purchase Request: ${pharmacy.name} - ${new Date().toLocaleDateString()}`,
                html: htmlContent
            });
        }

        results.push({ rep: rep.name, invoiceId: createdInvoice.id, status: 'SENT' });
    }

    return results;
}

}

export default new CatalogService();
