import { Router } from 'express';
import storageLocationController from './controllers/storage-location.controller';
import { validate } from '../../shared/middleware/validation.middleware';
import { createStorageLocationSchema, updateStorageLocationSchema, createInventorySchema, updateInventorySchema, queryInventorySchema } from './validators';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePharmacyAccess } from '../../shared/middleware/tenant.middleware';
import inventoryController from './controllers/inventory.controller';

const router = Router();

// Storage Location Routes
// All routes require authentication AND pharmacy access
router.use('/locations', authenticate, requirePharmacyAccess);

router.post('/locations', validate(createStorageLocationSchema), storageLocationController.create.bind(storageLocationController));
router.get('/locations', storageLocationController.findAll.bind(storageLocationController));
router.get('/locations/:id', storageLocationController.findById.bind(storageLocationController));
router.patch('/locations/:id', validate(updateStorageLocationSchema), storageLocationController.update.bind(storageLocationController));
router.delete('/locations/:id', storageLocationController.delete.bind(storageLocationController));

// Inventory Item Routes
// Base path is /api/inventory (from server.ts)
router.post('/items', validate(createInventorySchema), inventoryController.create.bind(inventoryController));
router.get('/items', validate(queryInventorySchema), inventoryController.findAll.bind(inventoryController));
router.get('/items/:id', inventoryController.findById.bind(inventoryController));
router.patch('/items/:id', validate(updateInventorySchema), inventoryController.update.bind(inventoryController));
router.delete('/items/:id', inventoryController.delete.bind(inventoryController));

// Alerts (Must be before /items/:id)
import { expiryAlertQuerySchema } from './validators';
router.get('/alerts/expiry', validate(expiryAlertQuerySchema), inventoryController.getExpiryAlerts.bind(inventoryController));
router.get('/alerts/stock', inventoryController.getLowStockAlerts.bind(inventoryController));

// Stock Management
import { addStockSchema, adjustStockSchema } from './validators';
router.post('/items/:id/stock', validate(addStockSchema), inventoryController.addStock.bind(inventoryController));
router.post('/items/:id/adjust', validate(adjustStockSchema), inventoryController.adjustStock.bind(inventoryController));

export default router;
