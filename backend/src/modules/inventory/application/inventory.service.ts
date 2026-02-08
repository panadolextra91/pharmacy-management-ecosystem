import { IInventoryRepository } from '../ports/inventory.repository.port';
import { CreateInventoryDto, UpdateInventoryDto, InventoryQueryDto, AddStockDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
// import prisma from '../../../shared/config/database'; // We still need prisma for Transaction (deduct logic) OR we move Logic to Repo.

export class InventoryService {
    constructor(private readonly repository: IInventoryRepository) { }

    async create(data: CreateInventoryDto) {
        const baseUnits = data.units.filter((u) => u.isBaseUnit);
        if (baseUnits.length !== 1) {
            throw new AppError('Inventory must have exactly one base unit', 400, 'INVALID_UNITS');
        }
        return this.repository.create(data);
    }

    async findAll(query: InventoryQueryDto) {
        return this.repository.findAll(query);
    }

    async findById(id: string, pharmacyId: string) {
        const item = await this.repository.findById(id, pharmacyId);
        if (!item) {
            throw new AppError('Inventory item not found', 404, 'NOT_FOUND');
        }
        return item;
    }

    async update(id: string, pharmacyId: string, data: UpdateInventoryDto) {
        await this.findById(id, pharmacyId);
        return this.repository.update(id, pharmacyId, data);
    }

    async addStock(inventoryId: string, pharmacyId: string, data: AddStockDto, tx?: any) {
        // 1. Verify existence
        await this.findById(inventoryId, pharmacyId);

        // 2. Add Stock Logic
        const existingBatch = await this.repository.findBatch(inventoryId, data.batchCode, tx);

        let batch;
        if (existingBatch) {
            batch = await this.repository.updateBatchStock(existingBatch.id, data.quantity, tx);
        } else {
            batch = await this.repository.createBatch({
                inventoryId,
                batchCode: data.batchCode,
                expiryDate: new Date(data.expiryDate),
                stockQuantity: data.quantity
            }, tx);
        }

        // Update Total
        const updatedInventory = await this.repository.updateTotalStock(inventoryId, data.quantity, tx);

        return { batch, totalStockLevel: updatedInventory.totalStockLevel };
    }

    async deductStock(inventoryId: string, pharmacyId: string, quantity: number, tx?: any) {
        await this.findById(inventoryId, pharmacyId);
        return this.repository.deductStock(inventoryId, pharmacyId, quantity, tx);
    }

    async getExpiryAlerts(pharmacyId: string, days: number = 30) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return this.repository.getExpiryAlerts(pharmacyId, date);
    }

    async getLowStockAlerts(pharmacyId: string) {
        return this.repository.getLowStockAlerts(pharmacyId);
    }

    async delete(id: string, pharmacyId: string) {
        const inventory = await this.findById(id, pharmacyId);
        if (inventory.totalStockLevel > 0) {
            throw new AppError('Cannot delete inventory with remaining stock', 400, 'INVALID_OPERATION');
        }
        return this.repository.delete(id, pharmacyId);
    }
}

import { PrismaInventoryRepository } from '../adapters/database/prisma-inventory.repository';
export default new InventoryService(new PrismaInventoryRepository());
