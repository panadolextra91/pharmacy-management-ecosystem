import { Router } from 'express';
import authController from './auth.controller';
import * as adminAuthController from './admin-auth.controller';
import staffController from './staff.controller';
import ownerManagementController from './owner-management.controller';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { requireOwner } from '../../../../shared/middleware/roles.middleware';
import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';
import { requireSystemAdmin } from '../../../../shared/middleware/system-admin.middleware';
import {
  registerOwnerSchema,
  loginOwnerSchema,
  registerStaffSchema,
  loginStaffSchema,
  registerCustomerSchema,
  loginCustomerSchema,
  verifyOtpSchema,
  sendOtpSchema,
  refreshTokenSchema,
  registerAdminSchema,
  loginAdminSchema
} from './validators';


const router = Router();

// System Admin Auth endpoints
router.post('/admin/register', validate(registerAdminSchema), adminAuthController.registerAdmin);
router.post('/admin/login', validate(loginAdminSchema), adminAuthController.loginAdmin);
router.post('/admin/refresh', validate(refreshTokenSchema), adminAuthController.refreshAdminToken);

// System Admin - Owner Management (God Mode) 🔐
router.get('/admin/owners', authenticate, requireSystemAdmin, ownerManagementController.getAllOwners.bind(ownerManagementController));
router.get('/admin/owners/:id', authenticate, requireSystemAdmin, ownerManagementController.getOwnerById.bind(ownerManagementController));
router.put('/admin/owners/:id/approve', authenticate, requireSystemAdmin, ownerManagementController.approveOwner.bind(ownerManagementController));
router.put('/admin/owners/:id/suspend', authenticate, requireSystemAdmin, ownerManagementController.suspendOwner.bind(ownerManagementController));
router.put('/admin/owners/:id/reactivate', authenticate, requireSystemAdmin, ownerManagementController.reactivateOwner.bind(ownerManagementController));

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
