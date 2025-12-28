import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';

type AllowedRole = 'OWNER' | 'MANAGER' | 'PHARMACIST' | 'STAFF' | 'CUSTOMER';

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (...allowedRoles: AllowedRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role as AllowedRole)) {
      return next(
        new AppError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Middleware to check if user is Owner
 */
export const requireOwner = requireRole('OWNER');

/**
 * Middleware to check if user is Staff (Manager, Pharmacist, or Staff)
 */
export const requireStaff = requireRole('MANAGER', 'PHARMACIST', 'STAFF');

/**
 * Middleware to check if user is Manager or Owner
 */
export const requireManager = requireRole('OWNER', 'MANAGER');

/**
 * Middleware to check if user is Customer
 */
export const requireCustomer = requireRole('CUSTOMER');

