import { Readable } from 'stream';
import csv from 'csv-parser';
import { ICatalogRepository } from '../ports/catalog.repository.port';
import { CreateGlobalMedicineDto, UpdateGlobalMedicineDto, GlobalMedicineQueryDto, SendPurchaseRequestDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import { sendEmail } from '../../../shared/config/email';
import { sanitizeCsvRow, normalizeName } from '../../../shared/utils/csv-sanitizer';

export class CatalogService {
    constructor(private readonly repository: ICatalogRepository) { }

    async create(data: CreateGlobalMedicineDto) {
        const supplier = await this.repository.findSupplierById(data.supplierId);
        if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

        const pharmaRep = await this.repository.findPharmaRepById(data.pharmaRepId);
        if (!pharmaRep) throw new AppError('Pharma Rep not found', 404, 'NOT_FOUND');

        return this.repository.create(data);
    }

    async findAll(query: GlobalMedicineQueryDto) {
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

    async findById(id: string) {
        const medicine = await this.repository.findById(id);
        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');
        return medicine;
    }

    async update(id: string, data: UpdateGlobalMedicineDto) {
        const medicine = await this.repository.findById(id);
        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');
        return this.repository.update(id, data);
    }

    async delete(id: string) {
        const medicine = await this.repository.findById(id);
        if (!medicine) throw new AppError('Medicine not found', 404, 'NOT_FOUND');

        await this.repository.delete(id);
        return { message: 'Medicine deleted successfully' };
    }

    async processCatalogCsv(buffer: Buffer, supplierId: string, pharmaRepId: string) {
        const results: any[] = [];
        const stream = Readable.from(buffer.toString());

        return new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (data: any) => results.push(data))
                .on('end', async () => {
                    try {
                        let successCount = 0;
                        const errors: any[] = [];

                        for (const rawRow of results) {
                            // Sanitization (Security: Excel Injection Protection)
                            const row = sanitizeCsvRow(rawRow);

                            if (!row.name) {
                                errors.push({ row, error: 'Missing name' });
                                continue;
                            }

                            try {
                                // Normalization & Mapping (Step 3: CSV Processing)
                                let categoryId = undefined;
                                if (row.category_name) {
                                    const normCategory = normalizeName(row.category_name);
                                    categoryId = await this.repository.upsertCategory(normCategory);
                                }

                                let brandId = undefined;
                                if (row.brand_name) {
                                    const normBrand = normalizeName(row.brand_name);
                                    brandId = await this.repository.upsertBrand(normBrand);
                                }

                                const data = {
                                    name: row.name,
                                    manufacturer: row.manufacturer,
                                    description: row.description,
                                    packaging: row.packaging,
                                    activeIngredient: row.activeIngredient,
                                    barcode: row.barcode,
                                    unitPrice: row.unitPrice ? parseFloat(row.unitPrice.toString().replace(/[^0-9.]/g, '')) : undefined,
                                    supplierId,
                                    pharmaRepId,
                                    categoryId,
                                    brandId,
                                    status: 'PENDING'
                                };

                                await this.repository.upsert(data);
                                successCount++;
                            } catch (err: any) {
                                errors.push({ row, error: err.message });
                            }
                        }

                        // Notification to Owner/Admin
                        if (successCount > 0) {
                            this.notifyNewCatalog(supplierId, successCount);
                        }

                        resolve({ successCount, errorCount: errors.length, errors });
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error: any) => reject(error));
        });
    }

    private async notifyNewCatalog(supplierId: string, count: number) {
        try {
            const service = await import('../../notifications/application/staff-notification.service');
            const pharmacies = await this.repository.findAllActivePharmacies();
            for (const ph of pharmacies) {
                await service.default.notifyPharmacy(
                    ph.id,
                    'CATALOG_IMPORTED',
                    'New Catalog Submissions',
                    `A new catalog has been submitted (Supplier ID: ${supplierId}). ${count} items are pending approval.`,
                    { supplierId, count },
                    ['MANAGER']
                );
            }
        } catch (err) {
            console.error('Failed to notify catalog import', err);
        }
    }

    // Approval Flow logic
    async getPendingItems() {
        return this.repository.findPendingItems();
    }

    async approveCatalogItems(ids: string[]) {
        if (!ids || ids.length === 0) throw new AppError('IDs are required', 400, 'BAD_REQUEST');
        await this.repository.approveItems(ids);
        return { message: `${ids.length} items approved successfully` };
    }

    async sendPurchaseRequest(data: SendPurchaseRequestDto) {
        const { pharmacyId, items } = data;

        const pharmacy = await this.repository.findPharmacyById(pharmacyId);
        if (!pharmacy) throw new AppError('Pharmacy not found', 404, 'NOT_FOUND');

        const itemIds = items.map((i: any) => i.catalogItemId);
        const catalogItems = await this.repository.findManyByIds(itemIds);

        if (catalogItems.length !== items.length) {
            throw new AppError('Some items not found in catalog', 400, 'BAD_REQUEST');
        }

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

        for (const group of itemsByRep.values()) {
            const { rep, items: repItems } = group;
            const totalAmount = repItems.reduce((sum, item) => sum + item.lineTotal, 0);

            const createdInvoice = await this.repository.createPurchaseInvoice({
                pharmacyId,
                supplierId: repItems[0].supplierId,
                supplierName: repItems[0].supplier?.name || "Unknown Supplier",
                invoiceNumber: `REQ-${Date.now().toString().slice(-6)}`,
                invoiceDate: new Date(),
                status: 'PENDING',
                totalAmount,
                notes: `Purchase Request via Email to ${rep.name}.\nItems:\n${repItems.map((i: any) => `- ${i.name} x${i.quantity} (Example Price: ${i.unitPrice})`).join('\n')}`
            });

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

import { PrismaCatalogRepository } from '../adapters/database/prisma-catalog.repository';
export default new CatalogService(new PrismaCatalogRepository());
