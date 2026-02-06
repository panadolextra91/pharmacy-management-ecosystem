
import salesService from './sales.service'; // Default instance
import { TestFactory } from '../../../../test/factories';
import prisma from '../../../shared/config/database';

// Hell-Cases for Sales Module
describe('SalesService (Hell-Cases)', () => {

    beforeAll(async () => {
        // Ensure clean slate
        await TestFactory.resetDb();
    });

    afterEach(async () => {
        await TestFactory.resetDb();
    });

    // Helper setup
    async function setupSalesScenario() {
        const supplier = await TestFactory.createSupplier();
        const rep = await TestFactory.createPharmaRep(supplier.id);
        const globalMed = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
        const owner = await TestFactory.createPharmacyOwner();
        const pharmacy = await TestFactory.createPharmacy(owner.id);
        const customer = await TestFactory.createCustomer();

        // Create Inventory & Unit
        const inventory = await TestFactory.createInventoryItem(pharmacy.id, globalMed.id);
        const unit = inventory.units[0]; // Base unit

        return { inventory, pharmacy, unit, owner, customer, supplier, rep }; // Return supplier & rep for reuse
    }

    it('SALE-H1: Snapshot Pricing Integrity - Cost Price must be frozen', async () => {
        const { inventory, pharmacy, unit, customer } = await setupSalesScenario();

        // 1. Create Batch with Purchase Price = 10,000
        const batch = await TestFactory.createBatch(inventory.id, 100, 30, 10000);

        // 2. Create Order (Sell 1 item)
        const order = await salesService.createOrder({
            pharmacyId: pharmacy.id,
            customerId: customer.id, // Real ID
            isPosSale: true,
            paymentMethod: 'CASH',
            items: [{
                inventoryId: inventory.id,
                unitId: unit.id,
                quantity: 1,
            }]
        });

        // 3. "The Villain": Supplier increases price to 15,000
        await prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: { purchasePrice: 15000 }
        });

        // 4. Check Order Item in DB
        const savedOrder = await prisma.pharmacyOrder.findUnique({
            where: { id: order.id },
            include: { items: true }
        });

        const item = savedOrder?.items[0];
        // Expect: Cost Price remains 10,000 (Snapshot)
        expect(Number(item?.costPrice)).toBe(10000);
        // Verify current batch price IS 15,000
        const currentBatch = await prisma.inventoryBatch.findUnique({ where: { id: batch.id } });
        expect(Number(currentBatch?.purchasePrice)).toBe(15000);
    });

    it('SALE-H2: The Atomic Rollback - Fail one, Rollback ALL', async () => {
        const { inventory, pharmacy, unit, customer, supplier, rep } = await setupSalesScenario();

        // Batch with 10 items
        await TestFactory.createBatch(inventory.id, 10, 30);

        // Create 2nd inventory item with 0 stock (reuse existing supplier & rep!)
        const globalMed2 = await TestFactory.createGlobalMedicine(supplier.id, rep.id);
        const inventory2 = await TestFactory.createInventoryItem(pharmacy.id, globalMed2.id); // 0 Stock
        const unit2 = inventory2.units[0];

        // Attempt to buy Item 1 (Valid) & Item 2 (Invalid - No Stock)
        const orderPromise = salesService.createOrder({
            pharmacyId: pharmacy.id,
            customerId: customer.id,
            isPosSale: true,
            paymentMethod: 'CASH',
            items: [
                { inventoryId: inventory.id, unitId: unit.id, quantity: 5 }, // Valid
                { inventoryId: inventory2.id, unitId: unit2.id, quantity: 1 } // Invalid (0 stock)
            ]
        });

        await expect(orderPromise).rejects.toThrow('Insufficient stock');

        // Expectation: Item 1 must NOT be deducted. Stock must remain 10.
        const inv1Check = await prisma.pharmacyInventory.findUnique({ where: { id: inventory.id } });
        expect(inv1Check?.totalStockLevel).toBe(10);

        // Verify No Ghost Order created
        const orders = await prisma.pharmacyOrder.count({ where: { pharmacyId: pharmacy.id } });
        expect(orders).toBe(0);
    });

    it('SALE-H3: Decimal & Financial Accuracy - No Rounding Errors', async () => {
        const { inventory, pharmacy, unit, customer } = await setupSalesScenario();

        // Set Unit Price to Decimal: 10.33 (Schema supports Decimal(10,2) = 2 decimal places)
        await prisma.inventoryUnit.update({
            where: { id: unit.id },
            data: { price: 10.33 }
        });

        await TestFactory.createBatch(inventory.id, 100, 30); // Ensure stock

        // Buy 3 items. Total should be 30.99
        const order = await salesService.createOrder({
            pharmacyId: pharmacy.id,
            customerId: customer.id,
            isPosSale: true,
            paymentMethod: 'CASH',
            items: [{ inventoryId: inventory.id, unitId: unit.id, quantity: 3 }]
        });

        // 3 * 10.33 = 30.99
        expect(Number(order.totalAmount)).toBe(30.99);

        const savedOrder = await prisma.pharmacyOrder.findUnique({ where: { id: order.id } });
        expect(Number(savedOrder?.totalAmount)).toBe(30.99);
    });

    it('SALE-H4: Cross-Tenant Sales Block - Cannot sell neighbor stock', async () => {
        const { inventory: invA, unit: unitA } = await setupSalesScenario();

        // Scenario: PharmB tries to sell InvA
        const ownerB = await TestFactory.createPharmacyOwner();
        const pharmB = await TestFactory.createPharmacy(ownerB.id);
        const customerB = await TestFactory.createCustomer();

        await expect(salesService.createOrder({
            pharmacyId: pharmB.id, // Attacker
            customerId: customerB.id,
            paymentMethod: 'CASH',
            items: [{ inventoryId: invA.id, unitId: unitA.id, quantity: 1 }]
        })).rejects.toThrow('Inventory item not found');
        // RLS or Service Check should hide invA from pharmB
    });

    it('SALE-H5: Zero/Negative Price Validation - Client Price Ignored', async () => {
        const { inventory, pharmacy, unit, customer } = await setupSalesScenario();
        await TestFactory.createBatch(inventory.id, 10, 30);

        // Real Price = 100 (Default from Factory)

        // Action: Send unitPrice = -100 in DTO (if DTO allowed it, or via cast)
        // Since createOrder ignores it, we expect Total to be calculated by REAL price (100).

        const order = await salesService.createOrder({
            pharmacyId: pharmacy.id,
            customerId: customer.id,
            paymentMethod: 'CASH',
            items: [{
                inventoryId: inventory.id,
                unitId: unit.id,
                quantity: 1,
                price: -100 // Malicious Input
            } as any]
        });

        // Expect: Total = 100 (Real Price), Not -100.
        expect(Number(order.totalAmount)).toBe(100);

        // Also check Negative Quantity
        await expect(salesService.createOrder({
            pharmacyId: pharmacy.id,
            customerId: customer.id,
            paymentMethod: 'CASH', // Fix: Add required field
            items: [{
                inventoryId: inventory.id,
                unitId: unit.id,
                quantity: -5 // Invalid Qty
            }]
        })).rejects.toThrow('Quantity must be at least 1');
    });

});
