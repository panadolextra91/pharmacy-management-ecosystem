import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import env from '../config/env';
import { TokenPayload } from '../../modules/access-control/application/dtos';

export type { TokenPayload };

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    payload as object,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
  );
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    payload as object,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const err = new Error('Token expired') as Error & { name: string };
      err.name = 'TokenExpiredError';
      throw err;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      const err = new Error('Invalid token') as Error & { name: string };
      err.name = 'JsonWebTokenError';
      throw err;
    }
    throw error;
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const err = new Error('Refresh token expired') as Error & { name: string };
      err.name = 'TokenExpiredError';
      throw err;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      const err = new Error('Invalid refresh token') as Error & { name: string };
      err.name = 'JsonWebTokenError';
      throw err;
    }
    throw error;
  }
}

