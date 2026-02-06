/**
 * AdminService - God Mode Operations
 * 
 * System Admin exclusive operations including:
 * - globalBan(): Suspend user + revoke sessions + notify Discord + notify Owner (if Staff)
 */

import { AppError } from '../../../shared/middleware/error-handler.middleware';
import { addSecurityJob, SecurityJobType } from '../../../shared/config/security.queue';
import authService from './auth.service';
import prisma from '../../../shared/config/database';
import { safeAddJob } from '../../../shared/queue/producer';
import { notificationQueue } from '../../../shared/config/queues';

export class AdminService {
    /**
     * The Master Kill Switch - Ban user globally
     * 
     * 1. Update status/isActive in DB (Owner/Staff)
     * 2. Revoke all sessions (tokens)
     * 3. Send Discord alert ("Công lý của Nữ hoàng")
     * 4. If Staff: notify their Pharmacy Owner
     */
    async globalBan(
        userId: string,
        userType: 'OWNER' | 'STAFF' | 'CUSTOMER',
        adminEmail: string
    ): Promise<{ success: boolean; message: string }> {
        let userName: string | undefined;
        let pharmacyName: string | undefined;
        let ownerId: string | undefined;

        // 1. Suspend user in DB based on type
        switch (userType) {
            case 'OWNER': {
                const owner = await prisma.owner.findUnique({ where: { id: userId } });
                if (!owner) throw new AppError('Owner not found', 404, 'NOT_FOUND');

                // Owner has status enum (OwnerStatus)
                await prisma.owner.update({
                    where: { id: userId },
                    data: { status: 'SUSPENDED' }
                });
                userName = owner.name;
                break;
            }

            case 'STAFF': {
                // PharmacyStaff model (not Staff)
                const staff = await prisma.pharmacyStaff.findUnique({
                    where: { id: userId },
                    include: { pharmacy: { include: { owner: true } } }
                });
                if (!staff) throw new AppError('Staff not found', 404, 'NOT_FOUND');

                // Staff uses isActive (boolean) not status
                await prisma.pharmacyStaff.update({
                    where: { id: userId },
                    data: { isActive: false }
                });
                userName = staff.name;
                pharmacyName = staff.pharmacy?.name;
                ownerId = staff.pharmacy?.ownerId;
                break;
            }

            case 'CUSTOMER': {
                const customer = await prisma.customer.findUnique({ where: { id: userId } });
                if (!customer) throw new AppError('Customer not found', 404, 'NOT_FOUND');

                // Customers don't have status field, we'll just revoke tokens
                userName = customer.fullName || customer.phone;
                break;
            }

            default:
                throw new AppError('Invalid user type', 400, 'INVALID_USER_TYPE');
        }

        // 2. Revoke ALL sessions (tokens)
        const role = userType === 'STAFF' ? 'STAFF' : userType;
        await authService.revokeAllSessions(userId, role);

        // 3. Send Discord alert ("Công lý của Nữ hoàng")
        addSecurityJob(SecurityJobType.DISCORD_ALERT, {
            alertType: 'ADMIN_BAN',
            userId,
            userType,
            userName,
            adminEmail,
            pharmacyName
        }).catch(err => console.error('[AdminService] Failed to dispatch Discord alert:', err));

        // 4. If Staff: notify their Pharmacy Owner
        if (userType === 'STAFF' && ownerId) {
            await this.notifyOwnerOfStaffBan(ownerId, userId, userName || 'Unknown Staff');
        }

        console.log(`[AdminService] ⚡ User ${userType}:${userId} has been BANNED by ${adminEmail}`);

        return {
            success: true,
            message: `User ${userName || userId} has been suspended. All sessions revoked.`
        };
    }

    /**
     * Notify Owner when their Staff is banned (SEC-H6: God's Hand)
     * Note: StaffNotification is linked to Staff, so we use BullMQ job for Owner notification
     */
    private async notifyOwnerOfStaffBan(ownerId: string, staffId: string, staffName: string): Promise<void> {
        try {
            // Get staff info for pharmacy
            const staff = await prisma.pharmacyStaff.findUnique({
                where: { id: staffId },
                select: { pharmacyId: true, id: true }
            });

            // Create StaffNotification for the banned staff's pharmacy (for audit/record)
            // This will be visible to other staff in the pharmacy
            if (staff?.pharmacyId) {
                await prisma.staffNotification.create({
                    data: {
                        pharmacyId: staff.pharmacyId,
                        staffId: staff.id, // Required field - using the banned staff's ID
                        type: 'STAFF_BANNED',
                        title: '⚠️ Nhân viên bị đình chỉ',
                        message: `Nhân viên ${staffName} đã bị System Admin đình chỉ tài khoản do vi phạm chính sách.`,
                        metadata: { ownerId, staffId, staffName, bannedAt: new Date().toISOString() }
                    }
                });
            }

            // Dispatch notification job (for push notification to Owner if configured)
            safeAddJob(notificationQueue, 'StaffBannedAlert', {
                ownerId,
                staffId,
                staffName,
                type: 'STAFF_BANNED'
            }).catch(err => console.error('[AdminService] Failed to dispatch owner notification:', err));

            console.log(`[AdminService] Owner ${ownerId} notified about Staff ${staffId} ban`);
        } catch (error) {
            console.error('[AdminService] Failed to notify owner:', error);
            // Don't throw - this is a non-critical operation
        }
    }
}

export default new AdminService();
