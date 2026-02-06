import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { SocketData } from '../types/socket.types';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    try {
        const authHeader = socket.handshake.auth.token;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        if (!token) {
            console.error('❌ Socket Auth Error: Token missing in handshake');
            return next(new Error('Authentication Error: Token missing'));
        }

        // Use centralized verification (uses env.JWT_SECRET)
        // Also captures: TokenExpiredError, JsonWebTokenError
        const decoded = verifyAccessToken(token);

        // Attach user info to socket instance for future use
        (socket.data as SocketData).userId = decoded.id;
        (socket.data as SocketData).role = decoded.role;
        (socket.data as SocketData).pharmacyId = decoded.pharmacyId;

        next();
    } catch (error: any) {
        console.error('❌ Socket Auth Failed:', error.message);
        // console.error('   Token received:', socket.handshake.auth.token); // Debug only (ensure logs are safe)
        return next(new Error('Authentication Error: Invalid Token'));
    }
};
