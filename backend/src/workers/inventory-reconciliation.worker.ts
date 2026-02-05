import prisma from '../shared/config/database';
import logger from '../shared/utils/logger';

/**
 * Inventory Reconciliation Worker (Self-Healing)
 * 
 * Runs every hour to detect and fix any discrepancies between:
 * - PharmacyInventory.totalStockLevel
 * - SUM(InventoryBatch.stockQuantity) for that inventory
 * 
 * This prevents data drift caused by race conditions or bugs.
 */

interface ReconciliationResult {
    inventoryId: string;
    pharmacyId: string;
    medicineName: string;
    oldValue: number;
    newValue: number;
    difference: number;
}

export async function runInventoryReconciliation(): Promise<void> {
    const startTime = Date.now();
    const fixes: ReconciliationResult[] = [];
    let scanned = 0;

    try {
        logger.info('[RECONCILIATION] Starting inventory reconciliation job...');

        // Get all active pharmacy inventories (not soft-deleted)
        const inventories = await prisma.pharmacyInventory.findMany({
            where: { isDeleted: false },
            select: {
                id: true,
                pharmacyId: true,
                name: true,
                totalStockLevel: true
            }
        });

        scanned = inventories.length;
        logger.info(`[RECONCILIATION] Scanning ${scanned} inventory items...`);

        for (const inventory of inventories) {
            // Calculate actual sum from batches using correct field names
            const batchSum = await prisma.inventoryBatch.aggregate({
                where: {
                    inventoryId: inventory.id,
                    isDeleted: false
                },
                _sum: {
                    stockQuantity: true
                }
            });

            const actualTotal = batchSum._sum?.stockQuantity || 0;
            const currentTotal = inventory.totalStockLevel;

            // Check for mismatch
            if (currentTotal !== actualTotal) {
                // FIX: Update to correct value
                await prisma.pharmacyInventory.update({
                    where: { id: inventory.id },
                    data: { totalStockLevel: actualTotal }
                });

                const result: ReconciliationResult = {
                    inventoryId: inventory.id,
                    pharmacyId: inventory.pharmacyId,
                    medicineName: inventory.name || 'Unknown',
                    oldValue: currentTotal,
                    newValue: actualTotal,
                    difference: actualTotal - currentTotal
                };

                fixes.push(result);

                logger.warn(
                    `[FIXED] Inventory ID ${inventory.id} | ` +
                    `"${result.medicineName}" | ` +
                    `Mismatch corrected: ${currentTotal} → ${actualTotal} ` +
                    `(diff: ${result.difference > 0 ? '+' : ''}${result.difference})`
                );
            }
        }

        const elapsed = Date.now() - startTime;

        if (fixes.length > 0) {
            logger.info(
                `[RECONCILIATION] ✅ Complete! ` +
                `Scanned: ${scanned} | Fixed: ${fixes.length} | Time: ${elapsed}ms`
            );
        } else {
            logger.info(
                `[RECONCILIATION] ✅ Complete! ` +
                `All ${scanned} items in sync. Time: ${elapsed}ms`
            );
        }

    } catch (error) {
        logger.error('[RECONCILIATION] ❌ Job failed:', error);
        throw error;
    }
}

// Export for testing or manual trigger
export default runInventoryReconciliation;
