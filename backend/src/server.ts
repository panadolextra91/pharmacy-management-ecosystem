import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import env from './shared/config/env';
import logger from './shared/utils/logger';
import { errorHandler } from './shared/middleware/error-handler.middleware';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
import authRoutes from './modules/access-control/routes';

app.get('/api', (_req, res) => {
  res.json({
    message: 'Pharmacy Management API',
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);

// Error handling (must be last)
app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
});

export default app;

