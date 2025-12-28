import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';

/**
 * Middleware to enforce pharmacy access and attach pharmacyId to request
 * MUST be used after authenticate middleware
 */
export const requirePharmacyAccess = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const pharmacyId = req.user.pharmacyId;

  if (!pharmacyId) {
    return next(
      new AppError('Pharmacy access required', 403, 'TENANT_ACCESS_DENIED')
    );
  }

  // Attach pharmacyId to request for use in services
  req.pharmacyId = pharmacyId;

  next();
};

/**
 * Middleware to optionally attach pharmacyId if user has one
 * Used for routes that can work with or without pharmacy context
 */
export const optionalPharmacyAccess = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.pharmacyId) {
    req.pharmacyId = req.user.pharmacyId;
  }
  next();
};

