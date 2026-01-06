import { Router } from 'express';
import { PurchaseController } from './controllers/purchase.controller';
import { PurchaseService } from './services/purchase.service';
import inventoryService from '../inventory/services/inventory.service';
import { PrismaClient } from '@prisma/client';
import { validate } from '../../shared/middleware/validation.middleware';
import { createPurchaseInvoiceSchema, purchaseQuerySchema, updatePurchaseStatusSchema } from './validators';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();
// inventoryService is already instantiated and exported
const purchaseService = new PurchaseService(prisma, inventoryService);
const purchaseController = new PurchaseController(purchaseService);

import { requirePharmacyAccess } from '../../shared/middleware/tenant.middleware';

router.use(authenticate, requirePharmacyAccess);

router.post(
    '/',
    validate(createPurchaseInvoiceSchema),
    purchaseController.createPurchase
);

router.get(
    '/',
    validate(purchaseQuerySchema),
    purchaseController.getPurchases
);

router.get('/:id', purchaseController.getPurchaseById);

router.patch(
    '/:id/status',
    validate(updatePurchaseStatusSchema),
    purchaseController.updateStatus
);

export default router;
