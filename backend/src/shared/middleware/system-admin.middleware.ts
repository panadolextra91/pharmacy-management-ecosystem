import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';

/**
 * Middleware: Require System Admin (God Mode)
 * Only allows requests from authenticated System Admins
 */
export const requireSystemAdmin = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    if (req.user.role !== 'SYSTEM_ADMIN') {
        throw new AppError(
            'Access denied. System Admin privileges required.',
            403,
            'FORBIDDEN'
        );
    }

    next();
};
