import prisma from '../src/shared/config/database';

async function checkDb() {
    console.log('\n🔍 INSPECTING DATABASE CONTENT...\n');

    // 1. Global Catalog
    const catalogCount = await prisma.globalMedicineCatalog.count();
    console.log(`💊 Global Medicine Catalog: ${catalogCount} items`);
    if (catalogCount > 0) {
        const sample = await prisma.globalMedicineCatalog.findMany({ take: 3 });
        console.log('   Sample:', sample.map(i => `${i.name} (${i.manufacturer})`).join(', '));
    }

    // 2. Pharmacies & Owners
    const ownerCount = await prisma.owner.count();
    const pharmacyCount = await prisma.pharmacy.count();
    console.log(`\n🏥 Ecosystem: ${ownerCount} Owners, ${pharmacyCount} Pharmacies`);

    // 3. Inventory (Per Pharmacy)
    const inventoryCount = await prisma.pharmacyInventory.count();
    const batchCount = await prisma.inventoryBatch.count();
    console.log(`\n📦 Total Inventory: ${inventoryCount} Items across all pharmacies`);
    console.log(`   Total Batches: ${batchCount} active batches`);

    // 4. Sales
    const orderCount = await prisma.pharmacyOrder.count();
    console.log(`\n💰 Total Orders: ${orderCount}`);

    console.log('\n--------------------------------------------------');
}

checkDb()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
