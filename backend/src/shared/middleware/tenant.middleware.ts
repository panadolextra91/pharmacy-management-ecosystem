import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';
import prisma from '../config/database';

/**
 * Middleware to enforce pharmacy access and attach pharmacyId to request
 * MUST be used after authenticate middleware
 * 
 * Priority:
 * 1. Staff account -> Use pharmacyId from token (auto-detected)
 * 2. Owner account -> MUST provide x-pharmacy-id header
 */
export const requirePharmacyAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    let pharmacyId = req.user.pharmacyId; // Staff has this from token

    // If no pharmacyId from token (Owner), check x-pharmacy-id header
    if (!pharmacyId) {
      const headerPharmacyId = req.headers['x-pharmacy-id'] as string;

      if (!headerPharmacyId) {
        return next(
          new AppError(
            'Pharmacy ID required. Provide x-pharmacy-id header.',
            400,
            'PHARMACY_ID_REQUIRED'
          )
        );
      }

      // Verify Owner has access to this pharmacy
      if (req.user.role === 'OWNER') {
        const pharmacy = await prisma.pharmacy.findFirst({
          where: {
            id: headerPharmacyId,
            ownerId: req.user.id,
            isActive: true,
          },
        });

        if (!pharmacy) {
          return next(
            new AppError(
              'You do not have access to this pharmacy',
              403,
              'PHARMACY_ACCESS_DENIED'
            )
          );
        }
      }

      pharmacyId = headerPharmacyId;
    }

    // Attach pharmacyId to request for use in services
    req.pharmacyId = pharmacyId;
    next();
  } catch (error) {
    next(error);
  }
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

