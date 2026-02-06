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
        let totalAmount = 0;
        const validItems: {
            inventoryId: string;
            unitId: string;
            quantity: number;
            price: number;
            costPrice: number;
            baseQuantity: number;
        }[] = [];

        for (const item of items) {
            // 3.1 Validate quantity >= 1
            if (!item.quantity || item.quantity < 1) {
                throw new AppError(
                    `Quantity must be at least 1 for item ${item.inventoryId}`,
                    400,
                    'INVALID_QUANTITY'
                );
            }

            // 3.2 Fetch inventory (verifies it exists and belongs to pharmacy)
            const inventory = await this.inventoryService.findById(item.inventoryId, pharmacyId);

            // 3.3 SECURITY: Verify unitId belongs to this inventoryId
            const unit = await prisma.inventoryUnit.findFirst({
                where: {
                    id: item.unitId,
                    inventoryId: item.inventoryId,
                },
            });

            if (!unit) {
                throw new AppError(
                    `Unit ID ${item.unitId} does not belong to inventory ${item.inventoryId}`,
                    400,
                    'UNIT_MISMATCH'
                );
            }

            // 3.4 Calculate base quantity using conversion factor
            const baseQuantity = item.quantity * unit.conversionFactor;

            // 3.5 Stock check (in base units)
            if (inventory.totalStockLevel < baseQuantity) {
                throw new AppError(
                    `Insufficient stock for ${inventory.name}. ` +
                    `Available: ${inventory.totalStockLevel}, Requested: ${baseQuantity} (base units)`,
                    400,
                    'INSUFFICIENT_STOCK'
                );
            }

            // 3.6 SERVER-SIDE PRICING - Never trust client!
            const unitPrice = Number(unit.price);
            const lineTotal = unitPrice * item.quantity;
            totalAmount += lineTotal;

            // 3.7 Snapshot Pricing: Get cost from FIFO batch
            const costPrice = await this.getOldestBatchCost(item.inventoryId);

            validItems.push({
                inventoryId: item.inventoryId,
                unitId: unit.id,
                quantity: item.quantity,
                price: unitPrice,
                costPrice,
                baseQuantity, // For stock deduction
            });
        }

        // 4. Create Order Transaction
        const result = await this.repository.executeTransaction(async (tx) => {
            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const itemsCreateInput = validItems.map(item => ({
                inventoryId: item.inventoryId,
                unitId: item.unitId,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice, // Snapshot Pricing!
            }));

            const order = await this.repository.createOrder({
                pharmacyId,
                customerId,
                orderNumber,
                status: isPosSale ? 'DELIVERED' : 'PENDING',
                paymentStatus: isPosSale ? 'PAID' : 'PENDING',
                paymentMethod,
                subtotal: totalAmount,
                totalAmount: totalAmount,
                shippingAddress: isPosSale ? 'In-Store Pickup' : 'TBD',
                items: itemsCreateInput,
            }, tx);

            // 5. Stock Deduction (for POS sales or confirmed orders)
            if (order.status === 'CONFIRMED' || order.status === 'DELIVERED') {
                for (const item of validItems) {
                    await this.inventoryService.deductStock(
                        item.inventoryId,
                        pharmacyId,
                        item.baseQuantity,
                        tx // Pass transaction to ensure atomicity
                    );
                }
            }

            // 5.1 Auto-Generate Invoice for POS Sales
            if (isPosSale && order.paymentStatus === 'PAID') {
                const invoiceNumber = `INV-${order.orderNumber.split('-')[1]}-${Math.floor(Math.random() * 1000)}`;
                await this.repository.createInvoice({
                    pharmacyId,
                    customerId,
                    orderId: order.id,
                    invoiceNumber,
                    totalAmount,
                    type: 'OFFLINE', // POS = Offline/Direct
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

    /**
     * Get oldest batch cost (FIFO) for snapshot pricing
     */
    private async getOldestBatchCost(inventoryId: string): Promise<number> {
        const batch = await prisma.inventoryBatch.findFirst({
            where: {
                inventoryId,
                stockQuantity: { gt: 0 },
            },
            orderBy: { expiryDate: 'asc' }, // FEFO: First Expired, First Out
            select: { purchasePrice: true },
        });

        return batch?.purchasePrice ? Number(batch.purchasePrice) : 0;
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
