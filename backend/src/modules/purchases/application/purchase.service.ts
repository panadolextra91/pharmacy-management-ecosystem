import { IPurchaseRepository } from '../ports/purchase.repository.port';
import { InventoryService } from '../../inventory/application/inventory.service';
import { CreatePurchaseInvoiceDto, PurchaseQueryDto, UpdatePurchaseStatusDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

export class PurchaseService {
    constructor(
        private readonly repository: IPurchaseRepository,
        private readonly inventoryService: InventoryService
    ) { }

    async createPurchase(pharmacyId: string, data: CreatePurchaseInvoiceDto) {
        let totalAmount = 0;
        const itemsCreateInput = data.items.map(item => {
            const lineTotal = Number(item.unitPrice) * item.quantity;
            totalAmount += lineTotal;

            return {
                inventoryId: item.inventoryId,
                batchCode: item.batchCode,
                expiryDate: new Date(item.expiryDate),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: lineTotal,
            };
        });

        return this.repository.create({
            pharmacyId,
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber,
            invoiceDate: new Date(data.invoiceDate),
            notes: data.notes,
            totalAmount,
            status: 'PENDING',
            items: itemsCreateInput,
        });
    }

    async getPurchases(pharmacyId: string, query: PurchaseQueryDto) {
        const result = await this.repository.findAll({ ...query, pharmacyId });
        return {
            data: result.data,
            meta: {
                total: result.total,
                page: query.page || 1,
                limit: query.limit || 10,
                totalPages: Math.ceil(result.total / (query.limit || 10)),
            },
        };
    }

    async getPurchaseById(pharmacyId: string, id: string) {
        const purchase = await this.repository.findById(id, pharmacyId);
        if (!purchase) throw new AppError('Purchase not found', 404, 'NOT_FOUND');
        return purchase;
    }

    async updateStatus(pharmacyId: string, id: string, data: UpdatePurchaseStatusDto) {
        const purchase = await this.getPurchaseById(pharmacyId, id);

        if (purchase.status !== 'PENDING') {
            throw new AppError(`Cannot update status of a ${purchase.status} purchase`, 400, 'INVALID_STATUS');
        }

        return this.repository.executeTransaction(async (tx) => {
            // 1. Update purchase status
            const updatedPurchase = await this.repository.updateStatus(id, data.status, tx);

            if (data.status === 'CONFIRMED' && purchase.items) {
                // 2. Loop items and call inventoryService.addStock
                // Note: purchase.items might need to be fetched if not in getPurchaseById result, 
                // but findById includes items.
                for (const item of purchase.items) {
                    await this.inventoryService.addStock(
                        item.inventoryId,
                        pharmacyId,
                        {
                            batchCode: item.batchCode,
                            expiryDate: item.expiryDate.toISOString(), // Convert Date to string if DTO expects string
                            quantity: item.quantity
                        },
                        tx
                    );
                }
            }

            return updatedPurchase;
        });
    }
}

import { PrismaPurchaseRepository } from '../adapters/database/prisma-purchase.repository';
// We need to import the singleton instance of InventoryService
import inventoryService from '../../inventory/application/inventory.service';
export default new PurchaseService(new PrismaPurchaseRepository(), inventoryService);
