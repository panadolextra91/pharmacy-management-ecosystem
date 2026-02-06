import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global Mock for Redis to prevent connecting to real Redis during tests if not needed
// or we let it connect to localhost:6379 if we want integration tests with Redis.
// For now, let's silence logger.

jest.mock('@/shared/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));
