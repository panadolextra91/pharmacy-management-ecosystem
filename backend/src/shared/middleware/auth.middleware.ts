import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token) as TokenPayload;

    req.user = {
      id: decoded.id,
      pharmacyId: decoded.pharmacyId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401, 'AUTH_INVALID'));
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
};

