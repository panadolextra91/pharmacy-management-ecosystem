import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../shared/types/express';
import authService from '../../application/auth.service';
import {
  RegisterOwnerDto,
  LoginOwnerDto,
  RegisterStaffDto,
  LoginStaffDto,
  RegisterCustomerDto,
  LoginCustomerDto,
  VerifyOtpDto,
  SendOtpDto,
  RefreshTokenDto,
} from '../../application/dtos';
import auditService from '../../../../shared/services/audit.service';
import { ActorType, AuditAction } from '@prisma/client';

export class AuthController {
  // Owner endpoints
  async registerOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterOwnerDto = req.body;
      const result = await authService.registerOwner(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async loginOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginOwnerDto = req.body;
      const result = await authService.loginOwner(data);
      const user = result.data.user as any;

      await auditService.log({
        req,
        pharmacyId: user.pharmacyId,
        actorId: user.id,
        actorType: ActorType.OWNER,
        action: AuditAction.LOGIN,
        resource: 'AUTH',
        metadata: { email: data.email }
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Staff endpoints
  async registerStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data: RegisterStaffDto = req.body;
      const pharmacyId = req.pharmacyId || data.pharmacyId;

      if (!pharmacyId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PHARMACY_ID_REQUIRED',
            message: 'Pharmacy ID is required',
          },
        });
        return;
      }

      const result = await authService.registerStaff(data, pharmacyId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async loginStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginStaffDto = req.body;
      const result = await authService.loginStaff(data);
      const user = result.data.user as any;

      await auditService.log({
        req,
        pharmacyId: user.pharmacyId,
        actorId: user.id,
        actorType: ActorType.STAFF,
        action: AuditAction.LOGIN,
        resource: 'AUTH',
        metadata: { email: data.email }
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Customer endpoints
  async registerCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterCustomerDto = req.body;
      const result = await authService.registerCustomer(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async loginCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginCustomerDto = req.body;
      const result = await authService.loginCustomer(data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // OTP endpoints
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const data: SendOtpDto = req.body;
      const result = await authService.sendOtp(data.phone);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const data: VerifyOtpDto = req.body;
      const result = await authService.verifyOtp(data.phone, data.otp);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Token endpoints
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RefreshTokenDto = req.body;
      const result = await authService.refreshToken(data.refreshToken);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      const user = (req as any).user;
      if (user) {
        await auditService.log({
          req,
          pharmacyId: user.pharmacyId,
          actorId: user.id || 'UNKNOWN',
          actorType: user.role === 'OWNER' ? ActorType.OWNER : user.role === 'STAFF' ? ActorType.STAFF : ActorType.SYSTEM_ADMIN,
          action: AuditAction.LOGOUT,
          resource: 'AUTH',
        });
      }

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

