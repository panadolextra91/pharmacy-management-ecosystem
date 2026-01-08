import { Router } from 'express';
import authController from './controllers/auth.controller';
import staffController from './controllers/staff.controller';
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
import { requireOwner } from '../../shared/middleware/roles.middleware';

const router = Router();

// Owner routes
router.post('/owners/register', validate(registerOwnerSchema), authController.registerOwner.bind(authController));
router.post('/owners/login', validate(loginOwnerSchema), authController.loginOwner.bind(authController));

// Staff routes (Only Owner can manage staff)
router.post('/staff/register', authenticate, requirePharmacyAccess, requireOwner, validate(registerStaffSchema), authController.registerStaff.bind(authController));
router.post('/staff/login', validate(loginStaffSchema), authController.loginStaff.bind(authController));
router.get('/staff', authenticate, requirePharmacyAccess, requireOwner, staffController.getAllStaff.bind(staffController));
router.patch('/staff/:id', authenticate, requirePharmacyAccess, requireOwner, staffController.updateStaff.bind(staffController));
router.delete('/staff/:id', authenticate, requirePharmacyAccess, requireOwner, staffController.deleteStaff.bind(staffController));

// Customer routes
router.post('/customers/register', validate(registerCustomerSchema), authController.registerCustomer.bind(authController));
router.post('/customers/login', validate(loginCustomerSchema), authController.loginCustomer.bind(authController));

// OTP routes
router.post('/otp/send', validate(sendOtpSchema), authController.sendOtp.bind(authController));
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp.bind(authController));

// Token routes
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken.bind(authController));

export default router;

