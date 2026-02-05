export interface PharmacyOrderEntity {
    id: string;
    pharmacyId: string;
    customerId: string | null;
    orderNumber: string;
    status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
    paymentMethod: 'CASH' | 'card' | 'TRANSFER' | 'QR'; // Adjusted to match schema if needed
    subtotal: number;
    totalAmount: number;
    items?: OrderItemEntity[];
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItemEntity {
    id: string;
    orderId: string;
    inventoryId: string;
    unitId: string;
    quantity: number;
    price: number;
    inventory?: any;
}

export interface PharmacyInvoiceEntity {
    id: string;
    pharmacyId: string;
    customerId: string | null;
    orderId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    totalAmount: number;
    type: 'ONLINE' | 'OFFLINE';
    items?: any[];
    pharmacy?: any;
}
