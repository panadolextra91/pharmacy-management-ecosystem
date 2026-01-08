import prisma from '../../../shared/config/database';
import { CreateOrderDto } from '../types';
import { AppError } from '../../../shared/middleware/error-handler.middleware';

class SalesService {
    async createOrder(data: CreateOrderDto) {
        const { pharmacyId, items, customerId, paymentMethod, isPosSale } = data;

        // 1. Validate Customer (if provided)
        let finalCustomerId = customerId;
        if (!finalCustomerId) {
            // For guest walk-in, link to a generic "Guest" customer or create one on fly?
            // For now, require customerId or handle "Guest" logic.
            // Simplified: Require Customer ID (Front-end should handle Guest creation if needed)
            throw new AppError('Customer ID is required', 400, 'BAD_REQUEST');
        }

        // 2. Validate Items & Stock Check
        // Need to calculate totalAmount and check availability
        let totalAmount = 0;
        const validItems: { inventoryId: string; unitId: string; quantity: number; price: any }[] = [];

        // Fetch all inventory items first
        const inventoryIds = items.map(i => i.inventoryId);
        const inventoryItems = await prisma.pharmacyInventory.findMany({
            where: {
                id: { in: inventoryIds },
                pharmacyId
            },
            include: { units: true }
        });

        if (inventoryItems.length !== items.length) {
            throw new AppError('Some items not found', 400, 'BAD_REQUEST');
        }

        for (const item of items) {
            const inventory = inventoryItems.find(inv => inv.id === item.inventoryId);
            if (!inventory) continue;

            const unit = inventory.units.find(u => u.name === item.unit);
            if (!unit) throw new AppError(`Unit ${item.unit} not found for ${inventory.name}`, 400, 'BAD_REQUEST');

            // Conversion to Base Unit for Stock Check
            const quantityInBase = item.quantity * unit.conversionFactor;

            if (inventory.totalStockLevel < quantityInBase) {
                throw new AppError(`Insufficient stock for ${inventory.name}`, 400, 'BAD_REQUEST');
            }

            const lineTotal = Number(unit.price) * item.quantity;
            totalAmount += lineTotal;

            validItems.push({
                inventoryId: item.inventoryId,
                unitId: unit.id,
                quantity: item.quantity,
                price: unit.price
            });
        }

        // 3. Create Order Transaction
        const result = await prisma.$transaction(async (tx) => {
            // A. Create Order Header
            const ordernumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const order = await tx.pharmacyOrder.create({
                data: {
                    pharmacyId,
                    customerId: finalCustomerId,
                    orderNumber: ordernumber,
                    status: isPosSale ? 'DELIVERED' : 'PENDING',
                    paymentStatus: isPosSale ? 'PAID' : 'PENDING',
                    paymentMethod,
                    subtotal: totalAmount,
                    totalAmount: totalAmount, // Add tax/delivery later
                    shippingAddress: 'In-Store Pickup', // Default for POS
                    items: {
                        create: validItems.map(item => ({
                            inventoryId: item.inventoryId,
                            unitId: item.unitId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: { items: true }
            });

            // B. Stock Deduction Logic (FIFO)
            if (order.status === 'CONFIRMED' || order.status === 'DELIVERED') {
                for (const item of validItems) {
                    const inventoryId = item.inventoryId;
                    const inventory = inventoryItems.find(inv => inv.id === inventoryId);
                    if (!inventory) continue;

                    const unit = inventory.units.find(u => u.id === item.unitId);
                    let qtyToDeduct = item.quantity * (unit?.conversionFactor || 1);

                    // Fetch batches sorted by expiry (FIFO)
                    const batches = await tx.inventoryBatch.findMany({
                        where: { inventoryId, stockQuantity: { gt: 0 } },
                        orderBy: { expiryDate: 'asc' }
                    });

                    for (const batch of batches) {
                        if (qtyToDeduct <= 0) break;

                        const deduct = Math.min(batch.stockQuantity, qtyToDeduct);

                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: { stockQuantity: { decrement: deduct } }
                        });

                        qtyToDeduct -= deduct;
                    }

                    if (qtyToDeduct > 0) {
                        throw new AppError(`Stock mismatch during deduction for ${inventory.name}`, 500, 'INTERNAL_SERVER_ERROR');
                    }

                    // Update Total Stock Cache
                    await tx.pharmacyInventory.update({
                        where: { id: inventoryId },
                        data: { totalStockLevel: { decrement: item.quantity * (unit?.conversionFactor || 1) } }
                    });
                }
            }

            // C. Create Invoice (Auto for POS/Paid)
            if (order.paymentStatus === 'PAID') {
                await tx.pharmacyInvoice.create({
                    data: {
                        pharmacyId,
                        customerId: finalCustomerId,
                        orderId: order.id,
                        invoiceNumber: `INV-${Date.now()}`,
                        invoiceDate: new Date(),
                        totalAmount: order.totalAmount,
                        type: isPosSale ? 'OFFLINE' : 'ONLINE',
                        items: {
                            create: validItems.map(item => ({
                                inventoryId: item.inventoryId,
                                quantity: item.quantity,
                                price: item.price
                            }))
                        }
                    }
                });
            }

            return order;
        });

        // Trigger Notification (Fire & Forget)
        if (!isPosSale) {
            // We need to fetch pharmacy details or just rely on ID? 
            // The service needs pharmacyId.
            // Notify Owner + Staff
            const message = `New order #${result.orderNumber} received ($${result.totalAmount})`;

            // Note: sales.service.ts needs to import staffNotificationService
            // We use 'require' dynamically or top-level import to avoid circular dep issues if any?
            // Notification is a separate module, should be fine.
            import('../../notifications/services/staff-notification.service').then(service => {
                service.default.notifyPharmacy(
                    pharmacyId,
                    'ORDER_NEW',
                    'New Order Received',
                    message,
                    { orderId: result.id, orderNumber: result.orderNumber }
                );
            }).catch(err => console.error('Failed to send notification', err));
        }

        return result;
    }
    async getReceipt(invoiceId: string, pharmacyId: string) {
        const invoice = await prisma.pharmacyInvoice.findUnique({
            where: { id: invoiceId, pharmacyId },
            include: {
                // payment: true, // Inverse relation issue, removing for now or need to query separately if needed
                pharmacy: true,
                items: {
                    include: { inventory: { include: { units: true } } }
                }
            }
        });

        if (!invoice) throw new AppError('Invoice not found', 404, 'NOT_FOUND');

        // Allow frontend to render specific receipt format
        return {
            storeName: invoice.pharmacy.name,
            storeAddress: invoice.pharmacy.address,
            storePhone: invoice.pharmacy.phone,
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.invoiceDate,
            items: invoice.items.map((i: any) => ({
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

export default new SalesService();
