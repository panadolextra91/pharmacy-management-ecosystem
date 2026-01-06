import { Response } from 'express';
import { AuthenticatedRequest } from '../../../shared/types/express';
import { PurchaseService } from '../services/purchase.service';
import { CreatePurchaseInvoiceDto, PurchaseQueryDto, UpdatePurchaseStatusDto } from '../types';

export class PurchaseController {
    private purchaseService: PurchaseService;

    constructor(purchaseService: PurchaseService) {
        this.purchaseService = purchaseService;
    }

    createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const pharmacyId = req.user?.pharmacyId;
            if (!pharmacyId) {
                res.status(400).json({ error: 'Pharmacy ID required' });
                return;
            }

            const purchase = await this.purchaseService.createPurchase(pharmacyId, req.body as CreatePurchaseInvoiceDto);
            res.status(201).json(purchase);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const pharmacyId = req.user?.pharmacyId;
            if (!pharmacyId) {
                res.status(400).json({ error: 'Pharmacy ID required' });
                return;
            }

            const result = await this.purchaseService.getPurchases(pharmacyId, req.query as unknown as PurchaseQueryDto);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getPurchaseById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const pharmacyId = req.user?.pharmacyId;
            if (!pharmacyId) {
                res.status(400).json({ error: 'Pharmacy ID required' });
                return;
            }

            const purchase = await this.purchaseService.getPurchaseById(pharmacyId, req.params.id);
            res.json(purchase);
        } catch (error: any) {
            res.status(404).json({ error: 'Purchase not found' });
        }
    };

    updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const pharmacyId = req.user?.pharmacyId;
            if (!pharmacyId) {
                res.status(400).json({ error: 'Pharmacy ID required' });
                return;
            }

            const purchase = await this.purchaseService.updateStatus(pharmacyId, req.params.id, req.body as UpdatePurchaseStatusDto);
            res.json(purchase);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
