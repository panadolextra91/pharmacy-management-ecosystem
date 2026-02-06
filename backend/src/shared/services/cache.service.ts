import { Redis } from 'ioredis';
import redisClient from '../config/redis';

export class CacheService {
    private client: Redis;
    private readonly DEFAULT_TTL = 3600; // 1 hour

    constructor() {
        this.client = redisClient;
    }

    /**
     * Get value from cache
     * @param key Cache key
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await this.client.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            console.warn(`[CacheService] Error getting key ${key}:`, error);
            return null; // Fail safe to DB
        }
    }

    /**
     * Set value to cache with TTL
     * @param key Cache key
     * @param value Data to cache
     * @param ttlSeconds Time to live in seconds (default 1 hour)
     */
    async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await this.client.setex(key, ttlSeconds, serialized);
        } catch (error) {
            console.warn(`[CacheService] Error setting key ${key}:`, error);
        }
    }

    /**
     * Delete value from cache
     * @param key Cache key
     */
    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            console.warn(`[CacheService] Error deleting key ${key}:`, error);
        }
    }

    /**
     * Delete keys matching a pattern (Scan)
     * Critical for invalidating lists (e.g. catalog:list:*)
     * @param pattern Glob pattern (e.g. "catalog:*")
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        } catch (error) {
            console.warn(`[CacheService] Error deleting pattern ${pattern}:`, error);
        }
    }

    /**
     * Helper: Get from cache, or fetch from DB and set cache (Cache-Aside)
     * @param key Cache key
     * @param fetchFn Function to fetch data from DB if cache miss
     * @param ttlSeconds TTL
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) {
            // Optional: Add X-Cache-Hit logic here if needed via context, but hard in service layer
            return cached;
        }

        const freshness = await fetchFn();
        if (freshness) {
            await this.set(key, freshness, ttlSeconds);
        }
        return freshness;
    }
}

export default new CacheService();
