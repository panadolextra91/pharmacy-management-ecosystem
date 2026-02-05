import multer from 'multer';
import { AppError } from './error-handler.middleware';

// Memory storage is better for processing buffers directly (CSV parsing)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit (Step 2: CSV Security)
    },
    fileFilter: (_req, file, cb) => {
        // Step 2: Only receive .csv
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new AppError('Only .csv files are allowed', 400, 'BAD_REQUEST') as any, false);
        }
    }
});
