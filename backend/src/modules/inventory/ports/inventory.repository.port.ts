import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InventoryEntity, InventoryBatchEntity } from '../domain/inventory.entity';
import { CreateInventoryDto, UpdateInventoryDto, InventoryQueryDto } from '../application/dtos';

export interface IInventoryRepository {
    create(data: CreateInventoryDto): Promise<InventoryEntity>;
    findAll(query: InventoryQueryDto): Promise<{ data: InventoryEntity[]; pagination: any }>;
    findById(id: string, pharmacyId: string): Promise<InventoryEntity | null>;
    update(id: string, pharmacyId: string, data: UpdateInventoryDto): Promise<InventoryEntity>;
    delete(id: string, pharmacyId: string): Promise<void>;
    deductStock(id: string, pharmacyId: string, quantity: number, tx?: any): Promise<InventoryEntity>;

    // New Atomic Method for Sales (Issue 4 Fix)
    deductStockWithCost(
        inventoryId: string,
        pharmacyId: string,
        quantity: number,
        tx: Prisma.TransactionClient
    ): Promise<{
        inventory: InventoryEntity;
        costPrice: Decimal;
        deductedBatches: { batchId: string; quantity: number; cost: Decimal }[]
    }>;

    // Batch & Stock specific
    findBatch(inventoryId: string, batchCode: string, tx?: any): Promise<InventoryBatchEntity | null>;
    createBatch(data: { inventoryId: string; batchCode: string; expiryDate: Date; stockQuantity: number }, tx?: any): Promise<InventoryBatchEntity>;
    updateBatchStock(batchId: string, quantityIncrement: number, tx?: any): Promise<InventoryBatchEntity>;
    updateTotalStock(inventoryId: string, quantityIncrement: number, tx?: any): Promise<InventoryEntity>;

    // Transaction support (optional abstraction, simpler to keep granular methods for now)
    // findBatchesWithStock(inventoryId: string): Promise<InventoryBatchEntity[]>;

    // Advanced
    getExpiryAlerts(pharmacyId: string, dateThreshold: Date): Promise<InventoryBatchEntity[]>;
    getLowStockAlerts(pharmacyId: string): Promise<any[]>;
}
