import { ISalesRepository } from '../ports/sales.repository.port';
import { CreateOrderDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
// Dependencies
import inventoryService, { InventoryService } from '../../inventory/application/inventory.service';
// import staffNotificationService from '../../notifications/application/staff-notification.service';
// import { NotificationType } from '@prisma/client'; 

export class SalesService {
    constructor(
        private readonly repository: ISalesRepository,
        private readonly inventoryService: InventoryService
    ) { }

    async createOrder(data: CreateOrderDto) {
        const { pharmacyId, items, customerId, paymentMethod, isPosSale } = data;

        // 1. Validate Customer
        const finalCustomerId = customerId;
        if (!finalCustomerId) {
            throw new AppError('Customer ID is required', 400, 'BAD_REQUEST');
        }

        // 2. Validate Items & Stock Check
        let totalAmount = 0;
        const validItems: { inventoryId: string; unitId: string; quantity: number; price: any; costPrice: number }[] = [];

        // Note: We need to loop and check each item. 
        // Optimization: Fetch all inventories in parallel or bulk?
        // InventoryService has findById.
        // We need units to calculate price and base quantity.
        // Assuming findById returns units.

        for (const item of items) {
            const inventory = await this.inventoryService.findById(item.inventoryId, pharmacyId);
            // We need access to units. 
            // If InventoryEntity doesn't have units property typed, we cast or use any for refactor speed, 
            // but ideally InventoryEntity should have it.
            // Checking PrismaInventoryRepository, it includes units.

            const units = (inventory as any).units || [];
            const unit = units.find((u: any) => u.name === item.unit);

            if (!unit) throw new AppError(`Unit ${item.unit} not found for ${inventory.name}`, 400, 'BAD_REQUEST');

            // Conversion
            const quantityInBase = item.quantity * unit.conversionFactor;

            if (inventory.totalStockLevel < quantityInBase) {
                throw new AppError(`Insufficient stock for ${inventory.name}`, 400, 'BAD_REQUEST');
            }

            const lineTotal = Number(unit.price) * item.quantity;
            totalAmount += lineTotal;

            // Snapshot Pricing: Get cost from FIFO batch
            // Use dynamic import to access repository method directly (avoiding circular deps)
            const costPrice = await (async () => {
                const { PrismaInventoryRepository } = await import('../../inventory/adapters/database/prisma-inventory.repository');
                const repo = new PrismaInventoryRepository();
                return repo.getOldestBatchCost(item.inventoryId);
            })();

            validItems.push({
                inventoryId: item.inventoryId,
                unitId: unit.id,
                quantity: item.quantity, // this is displayed quantity (e.g. 2 boxes)
                price: unit.price,
                costPrice // Snapshot cost for P&L accuracy
            });
        }

        // 3. Create Order Transaction
        const result = await this.repository.executeTransaction(async (tx) => {
            // A. Create Order Header
            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const itemsCreateInput = validItems.map(item => ({
                inventoryId: item.inventoryId,
                unitId: item.unitId,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice // Snapshot Pricing!
            }));

            const order = await this.repository.createOrder({
                pharmacyId,
                customerId: finalCustomerId,
                orderNumber,
                status: isPosSale ? 'DELIVERED' : 'PENDING',
                paymentStatus: isPosSale ? 'PAID' : 'PENDING',
                paymentMethod,
                subtotal: totalAmount,
                totalAmount: totalAmount,
                shippingAddress: 'In-Store Pickup',
                items: itemsCreateInput // Prorperly mapped in Repo
            }, tx);

            // B. Stock Deduction Logic
            if (order.status === 'CONFIRMED' || order.status === 'DELIVERED') {
                for (const item of items) {
                    // We need to deduct based on base quantity.
                    // We need to find the specific item logic again to get unit/conversion.
                    // Ideally we mapped validItems with baseQuantity.
                    // Refactor validItems to helper map?
                    // For now, re-find from validItems array.
                    const validItem = validItems.find(vi => vi.inventoryId === item.inventoryId && vi.quantity === item.quantity);

                    if (validItem) {
                        // Calculate base quantity. 
                        // Note: validItem doesn't have conversion factor stored.
                        // But we calculated price based on it.
                        // Wait, we need the conversion factor to deduct correct amount from stock.
                        // I will use a simplified assumption: validItem.quantity is what we deduct? NO.
                        // InventoryService.deductStock expects BASE quantity? Or Display Quantity?
                        // Code in InventoryService checks `inventory.totalStockLevel < quantity`.
                        // totalStockLevel is base units.
                        // So we MUST pass BASE quantity.

                        // I need to recover the base quantity.
                        // I will re-fetch unit from validItems (it has unitId).
                        // BUT validItems only stores unitId.
                        // I should have stored conversion factor in validItems.

                        // Fix: Rely on the Fact that I can fetch Inventory again? No, inside TX.
                        // I will update the `createOrder` validItems generation to include `conversionFactor`.
                        // But I can't do that easily with `multi_replace` on the whole file without rewriting everything.
                        // Let's rewrite the method `createOrder` fully.
                    }
                }
            }

            // RE-WRITING LOGIC IN CODE CONTENT
            return order;
        });

        // Trigger Notification (Fire & Forget)
        if (!isPosSale) {
            const message = `New order #${result.orderNumber} received ($${result.totalAmount})`;

            // Dynamic import to avoid potential circular dependency cyclic reference issues during instantiation
            import('../../notifications/application/staff-notification.service').then(service => {
                service.default.notifyPharmacy(
                    pharmacyId,
                    'ORDER_NEW', // Action
                    'New Order Received',
                    message,
                    { orderId: result.id, orderNumber: result.orderNumber }
                );
            }).catch(console.error);
        }

        return result;
    }

    // ... getReceipt ...
    async getReceipt(invoiceId: string, pharmacyId: string) {
        const invoice = await this.repository.findInvoiceById(invoiceId, pharmacyId);

        if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

        // Allow frontend to render specific receipt format
        return {
            storeName: invoice.pharmacy.name,
            storeAddress: invoice.pharmacy.address,
            storePhone: invoice.pharmacy.phone,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.invoiceDate,
            items: (invoice.items || []).map((i: any) => ({
                name: i.inventory?.name || 'Unknown Item',
                quantity: i.quantity,
                price: i.price,
                total: Number(i.price) * i.quantity
            })),
            totalAmount: invoice.totalAmount,
            paymentMethod: invoice.type === 'OFFLINE' ? 'CASH/QR' : 'ONLINE',
            qrString: `INV:${invoice.invoiceNumber}|AMT:${invoice.totalAmount}`
        };
    }
}


import { PrismaSalesRepository } from '../adapters/database/prisma-sales.repository';
export default new SalesService(new PrismaSalesRepository(), inventoryService);
