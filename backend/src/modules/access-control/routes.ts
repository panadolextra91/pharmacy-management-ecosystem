import { Router } from 'express';
import authController from './controllers/auth.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import {
  registerOwnerSchema,
  loginOwnerSchema,
  registerStaffSchema,
  loginStaffSchema,
  registerCustomerSchema,
  loginCustomerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from './validators';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../shared/middleware/tenant.middleware';

const router = Router();

// Owner routes
router.post('/owners/register', validate(registerOwnerSchema), authController.registerOwner.bind(authController));
router.post('/owners/login', validate(loginOwnerSchema), authController.loginOwner.bind(authController));

// Staff routes
router.post('/staff/register', authenticate, requirePharmacyAccess, validate(registerStaffSchema), authController.registerStaff.bind(authController));
router.post('/staff/login', validate(loginStaffSchema), authController.loginStaff.bind(authController));

// Customer routes
router.post('/customers/register', validate(registerCustomerSchema), authController.registerCustomer.bind(authController));
router.post('/customers/login', validate(loginCustomerSchema), authController.loginCustomer.bind(authController));

// OTP routes
router.post('/otp/send', validate(sendOtpSchema), authController.sendOtp.bind(authController));
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp.bind(authController));

// Token routes
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken.bind(authController));

export default router;

