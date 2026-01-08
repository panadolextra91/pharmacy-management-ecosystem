import prisma from '../shared/config/database';
import staffNotificationService from '../modules/notifications/services/staff-notification.service';
import logger from '../shared/utils/logger';
import dayjs from 'dayjs';

/**
 * Worker to run daily system checks:
 * 1. Expiry Alerts (Batches expiring in 30 days)
 * 2. Any other daily maintenance
 */

export const runSystemAlerts = async () => {
    logger.info('[SystemAlerts] Running daily system checks...');

    try {
        await checkExpiringBatches();
    } catch (error) {
        logger.error('[SystemAlerts] Error running checks:', error);
    }
};

async function checkExpiringBatches() {
    // Alert threshold: 30 days
    const warningDate = dayjs().add(30, 'day').toDate();
    const today = new Date();

    // Find active pharmacies
    const pharmacies = await prisma.pharmacy.findMany({ where: { isActive: true } });

    for (const pharmacy of pharmacies) {
        // Find batches expiring soon for this pharmacy
        // We could optimize this query but per-pharmacy loop is safer for notification grouping
        const expiringBatches = await prisma.inventoryBatch.findMany({
            where: {
                inventory: { pharmacyId: pharmacy.id },
                stockQuantity: { gt: 0 },
                expiryDate: { lte: warningDate, gte: today } // Don't spam about already expired? Or maybe we should.
            },
            include: { inventory: true }
        });

        if (expiringBatches.length > 0) {
            // Group by logic? Or one summary notification?
            // "5 batches are expiring soon"

            await staffNotificationService.notifyPharmacy(
                pharmacy.id,
                'INVENTORY_EXPIRY_ALERT',
                'Expiry Alert',
                `${expiringBatches.length} batches are expiring within 30 days. Please check inventory.`,
                { count: expiringBatches.length }
            );

            logger.info(`[SystemAlerts] Notified Pharmacy ${pharmacy.name} about ${expiringBatches.length} expiring batches.`);
        }
    }
}
