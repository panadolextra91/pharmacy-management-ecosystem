import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    pharmacyId?: string;
    role: string;
    email?: string;
  };
  pharmacyId?: string;
}

