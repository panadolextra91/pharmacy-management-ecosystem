import { Router } from 'express';
import reminderController from './reminder.controller';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authenticate } from '../../../../shared/middleware/auth.middleware';
import { createReminderSchema, updateReminderSchema, reminderActionSchema } from './validators';

const router = Router();

// All routes require authentication (Customer)
router.use(authenticate);

// Reminder CRUD
router.post('/', validate(createReminderSchema), reminderController.create.bind(reminderController));
router.get('/', reminderController.getMyReminders.bind(reminderController));
router.get('/history', reminderController.getHistory.bind(reminderController)); // Specific route before :id
router.get('/:id', reminderController.getOne.bind(reminderController));
router.patch('/:id', validate(updateReminderSchema), reminderController.update.bind(reminderController));
router.delete('/:id', reminderController.delete.bind(reminderController));

// Adherence
router.post('/:id/actions', validate(reminderActionSchema), reminderController.logAction.bind(reminderController));

export default router;
