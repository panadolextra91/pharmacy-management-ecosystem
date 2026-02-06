export interface ServerToClientEvents {
    'order:created': (data: { orderId: string; total: number }) => void;
    'stock:low': (data: { inventoryId: string; currentStock: number }) => void;
}

export interface ClientToServerEvents {
    'join:pharmacy': (data: { pharmacyId: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    role: string;
    pharmacyId?: string;
}
