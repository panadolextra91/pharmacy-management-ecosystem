import { Request, Response, NextFunction } from 'express';
import reminderService from '../services/reminder.service';
import { CreateReminderDto, UpdateReminderDto, ReminderQueryDto, ReminderActionDto } from '../types';

class ReminderController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const data: CreateReminderDto = req.body;
            const reminder = await reminderService.createReminder(customerId, data);
            res.status(201).json({ success: true, data: reminder });
        } catch (error) {
            next(error);
        }
    }

    async getMyReminders(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const query: ReminderQueryDto = req.query;
            const result = await reminderService.getMyReminders(customerId, query);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }

    async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            const reminder = await reminderService.getReminderById(customerId, id);
            res.status(200).json({ success: true, data: reminder });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            const data: UpdateReminderDto = req.body;
            const updated = await reminderService.updateReminder(customerId, id, data);
            res.status(200).json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            await reminderService.deleteReminder(customerId, id);
            res.status(200).json({ success: true, message: 'Reminder deleted' });
        } catch (error) {
            next(error);
        }
    }

    async logAction(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            const { id } = req.params;
            const data: ReminderActionDto = req.body;
            const log = await reminderService.logAction(customerId, id, data);
            res.status(201).json({ success: true, data: log });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const customerId = (req as any).user?.id;
            // Optional: date filtering from query
            const history = await reminderService.getAdherenceHistory(customerId);
            res.status(200).json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }
}

export default new ReminderController();
