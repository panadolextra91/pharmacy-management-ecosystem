import { Request, Response, NextFunction } from 'express';
import dataExportService from '../../application/data-export.service';
import auditService from '../../../../shared/services/audit.service';
import { ActorType, AuditAction } from '@prisma/client';

class DataExportController {
    /**
     * GET /admin/export/customers (System Admin Only)
     */
    async exportCustomers(req: Request, res: Response, next: NextFunction) {
        try {
            const csvData = await dataExportService.exportGlobalCustomers();

            // LOG: System Admin Exported Customers
            await auditService.log({
                req,
                pharmacyId: undefined, // Global
                actorId: (req as any).user?.id || 'SYSTEM_ADMIN',
                actorType: ActorType.SYSTEM_ADMIN,
                action: AuditAction.EXPORT,
                resource: 'CUSTOMER_DATA',
                metadata: { format: 'CSV', scope: 'GLOBAL' }
            });

            res.header('Content-Type', 'text/csv');
            res.attachment('customers_global.csv');
            res.send(csvData);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /admin/export/inventory/:pharmacyId (Owner/Admin)
     */
    async exportInventory(req: Request, res: Response, next: NextFunction) {
        try {
            const { pharmacyId } = req.params;
            // TODO: Ensure requester is Owner of this pharmacy or System Admin
            // Middleware handles generic auth, but specific ownership check is needed if not handled by routes

            const csvData = await dataExportService.exportInventory(pharmacyId);

            // LOG: Owner Exported Inventory
            await auditService.log({
                req,
                pharmacyId,
                actorId: (req as any).user?.id,
                actorType: (req as any).user?.role === 'SYSTEM_ADMIN' ? ActorType.SYSTEM_ADMIN : ActorType.OWNER,
                action: AuditAction.EXPORT,
                resource: 'INVENTORY_DATA',
                metadata: { format: 'CSV', pharmacyId }
            });

            res.header('Content-Type', 'text/csv');
            res.attachment(`inventory_${pharmacyId}.csv`);
            res.send(csvData);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /admin/export/sales/:pharmacyId (Owner/Admin)
     */
    async exportSales(req: Request, res: Response, next: NextFunction) {
        try {
            const { pharmacyId } = req.params;

            const csvData = await dataExportService.exportSales(pharmacyId);

            // LOG: Owner Exported Sales
            await auditService.log({
                req,
                pharmacyId,
                actorId: (req as any).user?.id,
                actorType: (req as any).user?.role === 'SYSTEM_ADMIN' ? ActorType.SYSTEM_ADMIN : ActorType.OWNER,
                action: AuditAction.EXPORT,
                resource: 'SALES_DATA',
                metadata: { format: 'CSV', pharmacyId }
            });

            res.header('Content-Type', 'text/csv');
            res.attachment(`sales_${pharmacyId}.csv`);
            res.send(csvData);
        } catch (error) {
            next(error);
        }
    }
}

export default new DataExportController();
