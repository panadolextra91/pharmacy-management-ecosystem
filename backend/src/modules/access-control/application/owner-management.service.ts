import prisma from '../../../shared/config/database';
import { AppError } from '../../../shared/middleware/error-handler.middleware';
import { OwnerStatus } from '@prisma/client';

/**
 * Owner Management Service - For System Admin (God Mode)
 * Handles Owner approval, suspension, and listing
 */
export class OwnerManagementService {
    /**
     * Get all Owners with optional status filter
     */
    async getAllOwners(status?: OwnerStatus) {
        const where = status ? { status } : {};
        return prisma.owner.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                status: true,
                subscriptionExpiry: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { pharmacies: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get Owner by ID with pharmacies count
     */
    async getOwnerById(id: string) {
        const owner = await prisma.owner.findUnique({
            where: { id },
            include: {
                pharmacies: {
                    select: { id: true, name: true, isActive: true }
                }
            }
        });

        if (!owner) {
            throw new AppError('Owner not found', 404, 'NOT_FOUND');
        }

        return owner;
    }

    /**
     * Approve an Owner - Change status from PENDING to ACTIVE
     */
    async approveOwner(id: string, subscriptionExpiry?: Date) {
        const owner = await prisma.owner.findUnique({ where: { id } });

        if (!owner) {
            throw new AppError('Owner not found', 404, 'NOT_FOUND');
        }

        if (owner.status !== 'PENDING') {
            throw new AppError(
                `Cannot approve. Owner status is ${owner.status}`,
                400,
                'INVALID_STATUS'
            );
        }

        return prisma.owner.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                subscriptionExpiry: subscriptionExpiry || null
            },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                subscriptionExpiry: true
            }
        });
    }

    /**
     * Suspend an Owner
     */
    async suspendOwner(id: string, reason?: string) {
        const owner = await prisma.owner.findUnique({ where: { id } });

        if (!owner) {
            throw new AppError('Owner not found', 404, 'NOT_FOUND');
        }

        if (owner.status === 'SUSPENDED') {
            throw new AppError('Owner is already suspended', 400, 'ALREADY_SUSPENDED');
        }

        // Log suspension reason (could be stored in a separate audit table)
        console.log(`[AUDIT] Owner ${id} suspended. Reason: ${reason || 'Not specified'}`);

        return prisma.owner.update({
            where: { id },
            data: { status: 'SUSPENDED' },
            select: {
                id: true,
                email: true,
                name: true,
                status: true
            }
        });
    }

    /**
     * Reactivate a suspended Owner
     */
    async reactivateOwner(id: string) {
        const owner = await prisma.owner.findUnique({ where: { id } });

        if (!owner) {
            throw new AppError('Owner not found', 404, 'NOT_FOUND');
        }

        if (owner.status !== 'SUSPENDED') {
            throw new AppError(
                `Cannot reactivate. Owner status is ${owner.status}`,
                400,
                'INVALID_STATUS'
            );
        }

        return prisma.owner.update({
            where: { id },
            data: { status: 'ACTIVE' },
            select: {
                id: true,
                email: true,
                name: true,
                status: true
            }
        });
    }
}

export default new OwnerManagementService();
