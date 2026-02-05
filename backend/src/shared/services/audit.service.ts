import { Request } from 'express';
import { PrismaClient, AuditAction, ActorType, AuditStatus } from '@prisma/client';
import prisma from '../config/database';

export interface CreateAuditLogDto {
    pharmacyId?: string; // Optional for System Admin
    actorId: string;
    actorType: ActorType;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    status?: AuditStatus;
    metadata?: any;
    req?: Request; // Optional request object to extract IP/UserAgent
}

export class AuditService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    /**
     * Create a new audit log entry asynchronously.
     * We don't want to block the main thread/request for logging.
     */
    async log(data: CreateAuditLogDto): Promise<void> {
        try {
            const { req, ...logData } = data;

            // Extract IP and User Agent if request object is provided
            let ipAddress = '';
            let userAgent = '';

            if (req) {
                ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '';
                userAgent = req.headers['user-agent'] || '';
            }

            await this.prisma.auditLog.create({
                data: {
                    ...logData,
                    ipAddress,
                    userAgent,
                    status: data.status || AuditStatus.SUCCESS
                }
            });
        } catch (error) {
            // Silently fail or log to system logger to avoid crashing the application
            console.error('Failed to create audit log:', error);
        }
    }

    /**
     * Retrieve audit logs with filtering capability.
     * System Admins can see all. Owners see only their pharmacy.
     */
    async getLogs(
        filters: {
            pharmacyId?: string;
            actorId?: string;
            resource?: string;
            action?: AuditAction;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        const { pharmacyId, actorId, resource, action, startDate, endDate, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (pharmacyId) where.pharmacyId = pharmacyId;
        if (actorId) where.actorId = actorId;
        if (resource) where.resource = resource;
        if (action) where.action = action;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [total, logs] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    // We might not be able to include Actor relation directly as it's polymorphic (Admin, Staff, Owner)
                    // So we just return the raw log and let FE handle resolution if needed
                }
            })
        ]);

        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

export default new AuditService();
