import { Router } from 'express';
import customerController from './controllers/customer.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../shared/middleware/tenant.middleware';
import { validate } from '../../shared/middleware/validation.middleware';
import {
    createCustomerSchema,
    createHealthMetricSchema,
    createAllergySchema,
    createHealthRecordSchema
} from './validators';

const router = Router();

router.use(authenticate);
// Customer Portal (Self-Service)
// Order matters: /me routes must be before /:id routes
router.get('/me', customerController.getMe.bind(customerController));
router.patch('/me', validate(createCustomerSchema), customerController.updateMe.bind(customerController)); // Reuse schema for now or partial
router.get('/me/history', customerController.getMyHistory.bind(customerController));
router.post('/me/metrics', validate(createHealthMetricSchema), customerController.addMyHealthMetric.bind(customerController));
router.delete('/me/allergies/:id', customerController.deleteMyAllergy.bind(customerController));
router.delete('/me/records/:id', customerController.deleteMyRecord.bind(customerController));

// Staff View (Requires Pharmacy Access)
router.use(requirePharmacyAccess); // Only subsequent routes need pharmacy context
router.get('/', customerController.search.bind(customerController));
router.post('/', validate(createCustomerSchema), customerController.create.bind(customerController));
router.get('/:id', customerController.getProfile.bind(customerController));

// Health Management (Staff Managed)
router.post('/:id/metrics', validate(createHealthMetricSchema), customerController.addHealthMetric);
router.post('/:id/allergies', validate(createAllergySchema), customerController.addAllergy);
router.post('/:id/records', validate(createHealthRecordSchema), customerController.addHealthRecord);


export default router;
