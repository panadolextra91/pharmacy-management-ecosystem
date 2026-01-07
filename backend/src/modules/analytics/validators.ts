import { z } from 'zod';

export const dateRangeSchema = z.object({
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    }),
});

export const topSellingSchema = z.object({
    query: z.object({
        limit: z.string().optional().transform(Number),
    }),
});
