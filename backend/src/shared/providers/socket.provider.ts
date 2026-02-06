import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { socketAuthMiddleware } from '../middleware/socket.middleware';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket.types';

export class SocketService {
    private static instance: SocketService;
    public io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public async init(httpServer: HttpServer): Promise<void> {
        this.io = new Server(httpServer, {
            cors: {
                origin: '*', // Allow all for demo purposes
                methods: ['GET', 'POST']
            }
        });

        // 1. Conditional Redis Adapter
        if (process.env.ENABLE_REDIS_ADAPTER === 'true') {
            const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);
            this.io.adapter(createAdapter(pubClient, subClient));
            console.log('🔗 Socket.io: Redis Adapter Connected');
        } else {
            console.log('⚠️ Socket.io: Running in Memory Mode (Redis Adapter Disabled via ENABLE_REDIS_ADAPTER)');
        }

        // 2. Authentication Middleware
        this.io.use(socketAuthMiddleware);

        // 3. Connection Logic
        this.io.on('connection', (socket: Socket) => {
            const data = socket.data as SocketData;
            console.log(`🔌 Client Connected: ${socket.id} (User: ${data.userId})`);

            // Auto-join Pharmacy Room if applicable
            if (data.pharmacyId) {
                const roomName = `pharmacy:${data.pharmacyId}`;
                socket.join(roomName);
                console.log(`   -> Joined Room: ${roomName}`);
            }

            // Auto-join User Private Room
            socket.join(`user:${data.userId}`);

            socket.on('disconnect', () => {
                console.log(`❌ Client Disconnected: ${socket.id}`);
            });
        });

        console.log('✅ Socket.io Initialized');
    }

    // Helper: Emit to specific Pharmacy
    public toPharmacy(pharmacyId: string, event: keyof ServerToClientEvents, data: any): void {
        if (!this.io) {
            console.warn('⚠️ Socket.io not initialized. Skipping emit.');
            return;
        }
        this.io.to(`pharmacy:${pharmacyId}`).emit(event, data);
    }
}

export const socketService = SocketService.getInstance();
