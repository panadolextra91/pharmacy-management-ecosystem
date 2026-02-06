import { InventoryService } from './inventory.service';
import { TestFactory } from '../../../../test/factories';
import { PrismaInventoryRepository } from '../adapters/database/prisma-inventory.repository';
import prisma from '../../../shared/config/database';

// Override global prisma with test setup if needed, but TestFactory uses its own
// Actually, service consumes repository which consumes prisma.
// We need to ensure Service uses the same Prisma instance or Test DB.
// The `prisma` imported from config is the one used by app.
// In test/setup.ts we set env vars, so `src / shared / config / database.ts` should pick up TEST DB URL.

describe('InventoryService', () => {
    let inventoryService: InventoryService;
    let repository: PrismaInventoryRepository;

    beforeAll(async () => {
        // Ensure clean slate
        await TestFactory.resetDb();

        repository = new PrismaInventoryRepository(); // No args
        inventoryService = new InventoryService(repository);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await TestFactory.resetDb();
    });

    describe('deductStock (FIFO/FEFO)', () => {
        it('INV-01: Should deduct from the OLDEST batch first (FIFO)', async () => {
            // Setup Area
            const supplier = await TestFactory.createSupplier();
            const rep = await TestFactory.createPharmaRep(supplier.id);
            const globalMed = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
            const owner = await TestFactory.createPharmacyOwner();
            const pharmacy = await TestFactory.createPharmacy(owner.id);
            const inventory = await TestFactory.createInventoryItem(pharmacy.id, globalMed.id);

            // Create Batch A: Expires in 1 day (Oldest/Soonest) - Qty 10
            const batchA = await TestFactory.createBatch(inventory.id, 10, 1);

            // Create Batch B: Expires in 100 days (Newer) - Qty 50
            const batchB = await TestFactory.createBatch(inventory.id, 50, 100);

            // Action: Deduct 5
            await inventoryService.deductStock(inventory.id, pharmacy.id, 5);

            // Verify
            const updatedBatchA = await prisma.inventoryBatch.findUnique({ where: { id: batchA.id } });
            const updatedBatchB = await prisma.inventoryBatch.findUnique({ where: { id: batchB.id } });
            const updatedInventory = await prisma.pharmacyInventory.findUnique({ where: { id: inventory.id } });

            expect(updatedBatchA?.stockQuantity).toBe(5); // 10 - 5 = 5
            expect(updatedBatchB?.stockQuantity).toBe(50); // Untouched
            expect(updatedInventory?.totalStockLevel).toBe(55); // (5 + 50)
        });

        it('INV-02: Should split deduction across multiple batches (Multi-Batch)', async () => {
            // Setup
            const supplier = await TestFactory.createSupplier();
            const rep = await TestFactory.createPharmaRep(supplier.id);
            const globalMed = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
            const owner = await TestFactory.createPharmacyOwner();
            const pharmacy = await TestFactory.createPharmacy(owner.id);
            const inventory = await TestFactory.createInventoryItem(pharmacy.id, globalMed.id);

            // Batch A: Qty 5 (Exp 1 day)
            const batchA = await TestFactory.createBatch(inventory.id, 5, 1);
            // Batch B: Qty 10 (Exp 2 days)
            const batchB = await TestFactory.createBatch(inventory.id, 10, 2);

            // Action: Deduct 10 (Takes all 5 from A, and 5 from B)
            await inventoryService.deductStock(inventory.id, pharmacy.id, 10);

            // Verify
            const updatedBatchA = await prisma.inventoryBatch.findUnique({ where: { id: batchA.id } });
            const updatedBatchB = await prisma.inventoryBatch.findUnique({ where: { id: batchB.id } });

            expect(updatedBatchA?.stockQuantity).toBe(0); // Drained
            expect(updatedBatchB?.stockQuantity).toBe(5); // 10 - 5 = 5
        });

        it('INV-03: Should throw error if Insufficient Stock', async () => {
            // Setup
            const supplier = await TestFactory.createSupplier();
            const rep = await TestFactory.createPharmaRep(supplier.id);
            const globalMed = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
            const owner = await TestFactory.createPharmacyOwner();
            const pharmacy = await TestFactory.createPharmacy(owner.id);
            const inventory = await TestFactory.createInventoryItem(pharmacy.id, globalMed.id);

            // Stock: 10
            await TestFactory.createBatch(inventory.id, 10, 5);

            // Action: Deduct 20
            await expect(inventoryService.deductStock(inventory.id, pharmacy.id, 20))
                .rejects
                .toThrow('Insufficient stock'); // Checks error message
        });
    });

    describe('deductStock (Hell-Cases)', () => {
        it('INV-H1: Expiry Filter - Should ignore Expired Batches', async () => {
            const { inventory, pharmacy } = await setupBasicInventory();

            // Batch A: Expired (Yesterday) - Qty 10
            const batchA = await TestFactory.createBatch(inventory.id, 10, -1);
            // Batch B: Valid (30 days) - Qty 10
            const batchB = await TestFactory.createBatch(inventory.id, 10, 30);

            // Action: Deduct 5
            await inventoryService.deductStock(inventory.id, pharmacy.id, 5);

            // Verify
            const updatedBatchA = await prisma.inventoryBatch.findUnique({ where: { id: batchA.id } });
            const updatedBatchB = await prisma.inventoryBatch.findUnique({ where: { id: batchB.id } });

            // A should be ignored (10 remaining), B should be deducted (10 - 5 = 5)
            expect(updatedBatchA?.stockQuantity).toBe(10);
            expect(updatedBatchB?.stockQuantity).toBe(5);
        });

        it('INV-H2: Precise Zero - Should handle exact deduction to 0', async () => {
            const { inventory, pharmacy } = await setupBasicInventory();
            await TestFactory.createBatch(inventory.id, 10, 30);

            await inventoryService.deductStock(inventory.id, pharmacy.id, 10);

            const updatedInventory = await prisma.pharmacyInventory.findUnique({ where: { id: inventory.id } });
            expect(updatedInventory?.totalStockLevel).toBe(0);
        });

        it('INV-H3: Multi-Batch Partial Overflow - Should deduct correctly across 3 batches', async () => {
            const { inventory, pharmacy } = await setupBasicInventory();
            // 3 Batches of 5 each. Total 15.
            const b1 = await TestFactory.createBatch(inventory.id, 5, 10);
            const b2 = await TestFactory.createBatch(inventory.id, 5, 20);
            const b3 = await TestFactory.createBatch(inventory.id, 5, 30);

            // Request 12. Should take 5(b1) + 5(b2) + 2(b3).
            await inventoryService.deductStock(inventory.id, pharmacy.id, 12);

            const ub1 = await prisma.inventoryBatch.findUnique({ where: { id: b1.id } });
            const ub2 = await prisma.inventoryBatch.findUnique({ where: { id: b2.id } });
            const ub3 = await prisma.inventoryBatch.findUnique({ where: { id: b3.id } });

            expect(ub1?.stockQuantity).toBe(0);
            expect(ub2?.stockQuantity).toBe(0);
            expect(ub3?.stockQuantity).toBe(3);
        });

        it('INV-H4: The Ghost Inventory - Should Fail with Wrong Pharmacy ID', async () => {
            const { inventory: invA } = await setupBasicInventory();

            const ownerB = await TestFactory.createPharmacyOwner();
            const pharmB = await TestFactory.createPharmacy(ownerB.id);
            // We try to access InvA (belonging to PharmA) using PharmB's ID.

            // Service check findById(id, pharmacyId) should block this.
            await expect(inventoryService.deductStock(invA.id, pharmB.id, 1))
                .rejects
                .toThrow('Inventory item not found');
        });

        // SKIPPING INV-H5 for now due to Int Schema Limitation
        // it.skip('INV-H5: Decimal Precision', ...); 
    });
});
async function setupBasicInventory() {
    const supplier = await TestFactory.createSupplier();
    const rep = await TestFactory.createPharmaRep(supplier.id);
    const globalMed = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
    const owner = await TestFactory.createPharmacyOwner();
    const pharmacy = await TestFactory.createPharmacy(owner.id);
    const inventory = await TestFactory.createInventoryItem(pharmacy.id, globalMed.id);
    return { inventory, pharmacy, owner, globalMed };
}
