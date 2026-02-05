
export interface OrderItemDto {
    inventoryId: string; // From PharmacyInventory
    quantity: number;    // MUST be >= 1
    unitId: string;      // Unit ID from InventoryUnit table (NOT name)
}

export interface CreateOrderDto {
    pharmacyId: string;
    customerId?: string; // Optional for walk-in
    items: OrderItemDto[];
    paymentMethod: 'CASH' | 'TRANSFER' | 'QR';
    notes?: string;
    isPosSale?: boolean; // True = Immediate deduction, delivered, paid
}

export interface OrderQueryDto {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
}
