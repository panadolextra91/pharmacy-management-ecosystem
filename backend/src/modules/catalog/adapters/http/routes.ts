import { Router } from 'express';
import catalogController from './catalog.controller';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authenticate, requireOwner, requireSystemAdmin } from '../../../../shared/middleware/auth.middleware';
import { queryGlobalMedicineSchema } from './validators';
import { upload } from '../../../../shared/middleware/upload.middleware';

const router = Router();

// 1. PUBLIC ROUTES (Rep OTP & Upload)
router.post('/request-otp', catalogController.requestCatalogOtp.bind(catalogController));
router.post('/upload', upload.single('file'), catalogController.uploadCatalog.bind(catalogController));

// 2. PROTECTED ROUTES (Standard browsing)
router.get('/', authenticate, validate(queryGlobalMedicineSchema), catalogController.findAll.bind(catalogController));
router.get('/:id', authenticate, catalogController.findById.bind(catalogController));

// 3. OWNER/ADMIN ONLY (Approval Flow)
router.get('/pending', authenticate, requireOwner, catalogController.getPendingItems.bind(catalogController));
router.patch('/approve', authenticate, requireOwner, catalogController.approveCatalogItems.bind(catalogController));

// Standard CRUD (Restricted)
router.delete('/:id', authenticate, requireSystemAdmin, catalogController.delete.bind(catalogController));

export default router;
