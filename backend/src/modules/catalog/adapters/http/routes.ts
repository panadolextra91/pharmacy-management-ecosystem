import { Router } from 'express';
import catalogController from './catalog.controller';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
// import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';
import { createGlobalMedicineSchema, updateGlobalMedicineSchema, queryGlobalMedicineSchema } from './validators';
// import { upload } from '../../../../shared/middleware/upload.middleware'; // To be uncommented when found

const router = Router();

// Public routes (or protected if needed - assuming pharmacy staff can view)
router.get('/', authenticate, validate(queryGlobalMedicineSchema), catalogController.findAll.bind(catalogController));
router.get('/:id', authenticate, catalogController.findById.bind(catalogController));

// Protected routes (Admin/Rep only? For now, allow authenticated)
// In real app, might need Roles.ADMIN or specific permissions
// router.post('/purchase-request', authenticate, catalogController.sendPurchaseRequest.bind(catalogController));
// router.post('/upload', authenticate, catalogController.uploadCatalog.bind(catalogController));
router.post('/', authenticate, validate(createGlobalMedicineSchema), catalogController.create.bind(catalogController));
router.patch('/:id', authenticate, validate(updateGlobalMedicineSchema), catalogController.update.bind(catalogController));
router.delete('/:id', authenticate, catalogController.delete.bind(catalogController));

export default router;
