import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { AuthenticatedRequest } from '../types/express';
import { AppError } from './error-handler.middleware';

export interface JWTPayload {
  id: string;
  pharmacyId?: string;
  role: string;
  email?: string;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    req.user = {
      id: decoded.id,
      pharmacyId: decoded.pharmacyId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'AUTH_INVALID'));
    } else {
      next(error);
    }
  }
};

