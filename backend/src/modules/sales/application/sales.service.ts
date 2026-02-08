import { ISalesRepository } from '../ports/sales.repository.port';
import { CreateOrderDto } from '../application/dtos';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import prisma from '../../../shared/config/database';
import { socketService } from '../../../shared/providers/socket.provider';
// Dependencies
import inventoryService, { InventoryService } from '../../inventory/application/inventory.service';

export class SalesService {
    constructor(
        private readonly repository: ISalesRepository,
        private readonly inventoryService: InventoryService
    ) { }

    /**
     * Create Order - SECURED VERSION
     * 
     * Security:
     * - Server-side pricing (NO client price accepted)
     * - Quantity validation (>= 1)
     * - UnitId ownership verification (unit must belong to inventory)
     * - FIFO cost snapshot for accurate P&L
     */
    async createOrder(data: CreateOrderDto) {
        const { pharmacyId, items, customerId, paymentMethod, isPosSale } = data;

        // 1. Validate Customer
        if (!customerId) {
            throw new AppError('Customer ID is required', 400, 'BAD_REQUEST');
        }

        // 2. Validate Items
        if (!items || items.length === 0) {
            throw new AppError('Order must have at least one item', 400, 'BAD_REQUEST');
        }

        // 3. Process each item with security checks
        // 4. Create Order Transaction
        const result = await this.repository.executeTransaction(async (tx) => {
            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            let totalAmount = 0;
            const validItems: any[] = [];

            // 1. Process Items & Deduct Stock ATOMICALLY
            for (const item of items) {
                // 1.1 Verify Unit & Inventory
                // We fetch inventory via the service (which might use the repo). 
                // Using findById inside TX ensures we see latest state if we strictly needed to, 
                // but here we mainly need unit conversion factors.
                // Optimally we could fetch this before TX, but for safety against race conditions on Unit changes, we do it here.

                // Note: We use the existing service method, but we might want to pass 'tx' if finding needs to be in TX.
                // Current findById doesn't support 'tx', but that's okay for read-only metadata (name, units).
                // The critical part is deduction.
                await this.inventoryService.findById(item.inventoryId, pharmacyId);

                const unit = await prisma.inventoryUnit.findFirst({
                    where: { id: item.unitId, inventoryId: item.inventoryId },
                });

                if (!unit) {
                    throw new AppError(`Unit ID ${item.unitId} does not belong to inventory ${item.inventoryId}`, 400, 'UNIT_MISMATCH');
                }

                if (!item.quantity || item.quantity < 1) {
                    throw new AppError(`Quantity must be at least 1 for item ${item.inventoryId}`, 400, 'INVALID_QUANTITY');
                }

                // 1.2 Calculate Pricing & Base Quantity
                const unitPrice = Number(unit.price);
                const lineTotal = unitPrice * item.quantity;
                totalAmount += lineTotal;
                const baseQuantity = item.quantity * unit.conversionFactor;

                // 1.3 ATOMIC DEDUCTION & COST CALCULATION
                // This throws if insufficient stock
                // Note: costPrice is Cost Per Base Unit (e.g., per Pill)
                const deductionResult = await this.inventoryService.deductStockWithCost(
                    item.inventoryId,
                    pharmacyId,
                    baseQuantity,
                    tx
                );

                // FIX: Calculate Cost Per Sold Unit (e.g., per Box)
                const costPricePerSoldUnit = deductionResult.costPrice.mul(unit.conversionFactor);

                validItems.push({
                    inventoryId: item.inventoryId,
                    unitId: unit.id,
                    quantity: item.quantity,
                    price: unitPrice,
                    costPrice: costPricePerSoldUnit,
                    costPerBaseUnit: deductionResult.costPrice, // Audit Trail
                    baseQuantity
                });
            }

            // 2. Create Order with Precise Costs
            const itemsCreateInput = validItems.map(item => ({
                inventoryId: item.inventoryId,
                unitId: item.unitId,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice,
            }));

            const order = await this.repository.createOrder({
                pharmacyId,
                customerId,
                orderNumber,
                status: isPosSale ? 'DELIVERED' : 'CONFIRMED', // Immediate deduction means confirmed/delivered
                paymentStatus: isPosSale ? 'PAID' : 'PENDING',
                paymentMethod,
                subtotal: totalAmount,
                totalAmount: totalAmount,
                shippingAddress: isPosSale ? 'In-Store Pickup' : 'TBD',
                items: itemsCreateInput,
            }, tx);

            // 3. Auto-Generate Invoice if POS
            if (isPosSale && order.paymentStatus === 'PAID') {
                const invoiceNumber = `INV-${order.orderNumber.split('-')[1]}-${Math.floor(Math.random() * 1000)}`;
                await this.repository.createInvoice({
                    pharmacyId,
                    customerId,
                    orderId: order.id,
                    invoiceNumber,
                    totalAmount,
                    type: 'OFFLINE',
                    items: validItems.map(vi => ({
                        inventoryId: vi.inventoryId,
                        quantity: vi.quantity,
                        price: vi.price
                    }))
                }, tx);
            }

            return order;
        });

        // 6. Trigger Notification (Async Queue)
        if (!isPosSale) {
            const message = `New order #${result.orderNumber} received ($${result.totalAmount})`;

            // Lazy load queue to avoid circular dependency issues during startup if any
            import('../../notifications/queue/notification.queue').then(({ notificationQueue }) => {
                import('../../../shared/queue/producer').then(({ safeAddJob }) => {
                    safeAddJob(notificationQueue, 'ORDER_NEW', {
                        pharmacyId,
                        type: 'ORDER_NEW',
                        title: 'New Order Received',
                        message,
                        data: { orderId: result.id, orderNumber: result.orderNumber }
                    });
                });
            });
        }

        // 7. REAL-TIME ALERT (Socket.io) - Fire & Forget
        // Refactored: Direct call using Singleton (cleaner code)
        socketService.toPharmacy(pharmacyId, 'order:created', {
            orderId: result.id,
            total: result.totalAmount
        });

        return result;
    }

    async getReceipt(invoiceId: string, pharmacyId: string) {
        const invoice = await this.repository.findInvoiceById(invoiceId, pharmacyId);

        if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

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
                total: Number(i.price) * i.quantity,
            })),
            totalAmount: invoice.totalAmount,
            paymentMethod: invoice.type === 'OFFLINE' ? 'CASH/QR' : 'ONLINE',
            qrString: `INV:${invoice.invoiceNumber}|AMT:${invoice.totalAmount}`,
        };
    }
}

import { PrismaSalesRepository } from '../adapters/database/prisma-sales.repository';
export default new SalesService(new PrismaSalesRepository(), inventoryService);
