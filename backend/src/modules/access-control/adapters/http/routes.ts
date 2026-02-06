import { Router } from 'express';
import authController from './auth.controller';
import * as adminAuthController from './admin-auth.controller';
import staffController from './staff.controller';
import ownerManagementController from './owner-management.controller';
import dataExportController from '../../../system-admin/adapters/http/data-export.controller';
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

// System Admin - Kill Switch API ⚡ (God's Hand)
router.post('/admin/security/suspend/:userId', authenticate, requireSystemAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;
    const adminEmail = (req as any).user?.email || 'system';

    if (!userType || !['OWNER', 'STAFF', 'CUSTOMER'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userType. Must be OWNER, STAFF, or CUSTOMER'
      });
    }

    const adminService = (await import('../../application/admin.service')).default;
    const result = await adminService.globalBan(userId, userType, adminEmail);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

// System Admin - Data Export 📥
router.get('/admin/export/customers', authenticate, requireSystemAdmin, dataExportController.exportCustomers.bind(dataExportController));

// Owner routes
router.post('/owners/register', validate(registerOwnerSchema), authController.registerOwner.bind(authController));
router.post('/owners/login', validate(loginOwnerSchema), authController.loginOwner.bind(authController));

// Owner - Data Export 📥
// Note: We use requireOwner or requireSystemAdmin (handled inside controller for advanced logic or here via middleware chain if simple)
// For simplicity and to allow Admin to export for tenants, we might need a unified middleware or just check in controller.
// But as per request: "Owner... tải... phải chọn từng cái".
// Let's protect it with `authenticate` and let controller/service validate access if pharmacyId is passed.
// Or we can use `requirePharmacyAccess` if the pharmacyId is in params/query?
// `requirePharmacyAccess` expects pharmacyId in body/query/params.
router.get('/export/sales/:pharmacyId', authenticate, requirePharmacyAccess, dataExportController.exportSales.bind(dataExportController));
router.get('/export/inventory/:pharmacyId', authenticate, requirePharmacyAccess, dataExportController.exportInventory.bind(dataExportController));

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
router.post('/logout', validate(refreshTokenSchema), authController.logout.bind(authController));

export default router;
