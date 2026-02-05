import { Request, Response, NextFunction } from 'express';
import customerService from '../../application/customer.service';
import { CreateCustomerDto } from '../../application/dtos';

class CustomerController {
    async search(req: Request, res: Response, next: NextFunction) {
        try {
            const { search, page, limit } = req.query as any;
            const result = await customerService.searchCustomers({
                search,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20
            });
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data: CreateCustomerDto = req.body;
            const customer = await customerService.createCustomer(data);
            res.status(201).json({ success: true, data: customer });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const pharmacyId = (req as any).pharmacyId || (req as any).user?.pharmacyId;
            const profile = await customerService.getCustomerProfile(id, pharmacyId);
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    async addHealthMetric(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const metric = await customerService.addHealthMetric(id, req.body);
            res.status(201).json({ success: true, data: metric });
        } catch (error) {
            next(error);
        }
    }

    async addAllergy(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const allergy = await customerService.addAllergy(id, req.body);
            res.status(201).json({ success: true, data: allergy });
        } catch (error) {
            next(error);
        }
    }

    async addHealthRecord(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const record = await customerService.addHealthRecord(id, req.body);
            res.status(201).json({ success: true, data: record });
        } catch (error) {
            next(error);
        }
    }

    async getMe(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id; // From Auth Middleware
            if (!customerId) throw new Error('User ID missing');

            const profile = await customerService.getMe(customerId);
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    async updateMe(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const updated = await customerService.updateMe(customerId, req.body);
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async getMyHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const history = await customerService.getGlobalHistory(customerId);
            res.status(200).json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }

    // Reuse addHealthMetric/Allergy/Record but for 'me'
    async addMyHealthMetric(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const metric = await customerService.addHealthMetric(customerId, req.body);
            res.status(201).json({ success: true, data: metric });
        } catch (error) {
            next(error);
        }
    }
    // ... similarly for others if needed, or reuse generic adding id
    async deleteMyAllergy(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            await customerService.deleteAllergy(customerId, id);
            res.status(200).json({ success: true, message: 'Allergy deleted' });
        } catch (error) {
            next(error);
        }
    }

    async deleteMyRecord(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            await customerService.deleteHealthRecord(customerId, id);
            res.status(200).json({ success: true, message: 'Record deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export default new CustomerController();
