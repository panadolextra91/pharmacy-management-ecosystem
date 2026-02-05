import { Router } from 'express';
import inventoryController from './inventory.controller';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { createInventorySchema, updateInventorySchema, addStockSchema } from './validators';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../../../shared/middleware/tenant.middleware';

const router = Router();

// Apply middleware to all routes
router.use(authenticate, requirePharmacyAccess);

// Alerts
router.get('/alerts/expiry', inventoryController.getExpiryAlerts.bind(inventoryController));
router.get('/alerts/stock', inventoryController.getLowStockAlerts.bind(inventoryController));

// CRUD
router.get('/', inventoryController.findAll.bind(inventoryController));
router.get('/:id', inventoryController.findById.bind(inventoryController));
router.post('/', validate(createInventorySchema), inventoryController.create.bind(inventoryController));
router.patch('/:id', validate(updateInventorySchema), inventoryController.update.bind(inventoryController));
router.delete('/:id', inventoryController.delete.bind(inventoryController));

// Stock Operations
router.post('/:id/stock', validate(addStockSchema), inventoryController.addStock.bind(inventoryController));
router.post('/:id/adjust', inventoryController.adjustStock.bind(inventoryController));

export default router;
