import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';

/**
 * Middleware to restrict access to Owners only
 */
export const requireOwner = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!req.user || req.user.role !== 'OWNER') {
        return next(
            new AppError('Access restricted to Pharmacy Owners', 403, 'ACCESS_DENIED')
        );
    }
    next();
};

/**
 * Middleware to restrict access to Staff roles (Manager, Pharmacist, Staff) OR Owner
 * Owners are implicitly allowed access to staff-level resources
 */
export const requireStaff = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const allowedRoles = ['OWNER', 'MANAGER', 'PHARMACIST', 'STAFF'];

    if (!allowedRoles.includes(req.user.role)) {
        return next(
            new AppError('Access restricted to authorized staff', 403, 'ACCESS_DENIED')
        );
    }
    next();
};

/**
 * Middleware for specific high-level staff actions (e.g. only Managers or Owners)
 */
export const requireManager = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const allowedRoles = ['OWNER', 'MANAGER'];

    if (!allowedRoles.includes(req.user.role)) {
        return next(
            new AppError('Access restricted to Managers', 403, 'ACCESS_DENIED')
        );
    }
    next();
};
