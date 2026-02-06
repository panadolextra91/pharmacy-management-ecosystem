import { PrismaClient, StaffRole, CatalogStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- CONFIGURATION ---
const GLOBAL_CATALOG_SIZE = 10000; // Target: 10k items
const BATCH_SIZE = 1000; // Chunk size for createMany

// --- DATA GENERATORS ---
const PREFIXES = ['Panadol', 'Amoxicillin', 'Vitamin', 'Omega-3', 'Ibuprofen', 'Paracetamol', 'Ceffixime', 'Berberin', 'Gingko Biloba', 'Calcium'];
const SUFFIXES = ['Extra', 'Forte', '500mg', 'Kids', 'Plus', 'Gold', 'Premium', 'Rapid Release', 'Sustained Release', 'Liquid'];
const MANUFACTURERS = ['GSK', 'Pfizer', 'Sanofi', 'Novartis', 'Bayer', 'Zuellig Pharma', 'DHG Pharma', 'Traphaco'];

function getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateMedicineName(index: number) {
    return `${getRandomItem(PREFIXES)} ${getRandomItem(SUFFIXES)} ${index}`;
}

async function main() {
    console.log('🚀 STARTING BIG DATA SEEDING (THESIS MODE)...');

    // 1. CLEANUP (Careful!)
    console.log('🧹 Cleaning old data...');
    // Order matters due to FKs
    await prisma.purchaseItem.deleteMany();
    await prisma.purchaseInvoice.deleteMany();
    await prisma.systemAdmin.deleteMany(); // Cleanup admins
    await prisma.purchaseInvoice.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.pharmacyInvoice.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.customerCart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.pharmacyOrder.deleteMany();
    await prisma.inventoryBatch.deleteMany();
    await prisma.inventoryUnit.deleteMany();
    await prisma.pharmacyInventory.deleteMany();
    await prisma.staffNotification.deleteMany();
    await prisma.pharmacyStaff.deleteMany();
    await prisma.pharmacy.deleteMany();
    await prisma.owner.deleteMany();
    await prisma.globalMedicineCatalog.deleteMany();
    await prisma.pharmaSalesRep.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.category.deleteMany();

    // 2. MASTER DATA (Suppliers, Categories, Brands)
    console.log('🏭 Seeding Master Data...');
    await prisma.supplier.createMany({
        data: MANUFACTURERS.map(name => ({
            name,
            address: 'Global HQ',
            contactInfo: { phone: '1900-1000' }
        }))
    });

    // Fetch IDs back 
    const supplierRecords = await prisma.supplier.findMany();
    const supplierIds = supplierRecords.map(s => s.id);

    await prisma.category.createMany({
        data: ['Pain Relief', 'Antibiotics', 'Supplements', 'Cardiovascular', 'Respiratory', 'Digestion'].map(name => ({ name }))
    });
    const categoryRecords = await prisma.category.findMany();
    const categoryIds = categoryRecords.map(c => c.id);

    // 3. GLOBAL CATALOG (10,000 Items)
    console.log(`💊 Generating ${GLOBAL_CATALOG_SIZE} Global Medicines...`);

    // Fix: Create a dummy Rep
    const rep = await prisma.pharmaSalesRep.create({
        data: {
            name: 'Thesis Rep',
            email: 'rep@thesis.com',
            phone: '0909000000',
            supplierId: supplierIds[0]
        }
    });

    const catalogData = [];
    for (let i = 0; i < GLOBAL_CATALOG_SIZE; i++) {
        catalogData.push({
            name: generateMedicineName(i),
            manufacturer: getRandomItem(MANUFACTURERS),
            description: 'Generated for Thesis Benchmark',
            supplierId: getRandomItem(supplierIds),
            categoryId: getRandomItem(categoryIds),
            pharmaRepId: rep.id,
            unitPrice: 5000 + Math.floor(Math.random() * 500000),
            status: CatalogStatus.APPROVED,
            activeIngredient: 'Placebo'
        });
    }

    // Chunk Insert
    /* 
       Using createMany is fast.
    */
    const chunks = [];
    for (let i = 0; i < catalogData.length; i += BATCH_SIZE) {
        const chunk = catalogData.slice(i, i + BATCH_SIZE);
        chunks.push(chunk);
    }

    for (const [idx, chunk] of chunks.entries()) {
        await prisma.globalMedicineCatalog.createMany({ data: chunk });
        console.log(`   Processed Chunk ${idx + 1}/${chunks.length}`);
    }

    // Fetch all Catalog IDs for Inventory distribution
    const allCatalogItems = await prisma.globalMedicineCatalog.findMany({ select: { id: true, name: true, unitPrice: true } });
    console.log(`✅ ${allCatalogItems.length} Medicines Created.`);

    // 4. OWNERS & PHARMACIES
    console.log('👥 Creating Owners & Pharmacies...');
    const passwordHash = await bcrypt.hash('123456', 10);

    // 4.1 Create System Admin
    await prisma.systemAdmin.create({
        data: {
            name: 'Super Admin',
            email: 'admin@pharmacy-saas.com',
            password: passwordHash
        }
    });
    console.log('   👑 System Admin Created.');

    const owners = [
        { name: 'Nguyen Van Ty Phus (Big Corp)', email: 'typhu@pharmacy.com', pharmacies: 2 },
        { name: 'Tran Van SME', email: 'sme@pharmacy.com', pharmacies: 1 },
        { name: 'Le Thi Startup', email: 'startup@pharmacy.com', pharmacies: 1 },
    ];

    for (const o of owners) {
        const owner = await prisma.owner.create({
            data: {
                name: o.name,
                email: o.email,
                password: passwordHash,
                status: 'ACTIVE',
                phone: '0901234567'
            }
        });

        for (let i = 0; i < o.pharmacies; i++) {
            const pharmacy = await prisma.pharmacy.create({
                data: {
                    ownerId: owner.id,
                    name: `${o.name} - Branch ${i + 1}`,
                    address: `Street ${i}, District ${i + 1}, HCMC`,
                    phone: `0283${i}00000`,
                    hours: { open: '08:00', close: '22:00' },
                    latitude: 10.7 + i * 0.01,
                    longitude: 106.6 + i * 0.01
                }
            });

            // 5. STAFF (3 per Pharmacy)
            await prisma.pharmacyStaff.createMany({
                data: [
                    { pharmacyId: pharmacy.id, name: 'Manager A', email: `manager.${pharmacy.id}@p.com`, role: StaffRole.MANAGER, username: `m_${pharmacy.id.substring(0, 4)}`, password: passwordHash },
                    { pharmacyId: pharmacy.id, name: 'Pharmacist B', email: `pharmacist.${pharmacy.id}@p.com`, role: StaffRole.PHARMACIST, username: `p_${pharmacy.id.substring(0, 4)}`, password: passwordHash },
                    { pharmacyId: pharmacy.id, name: 'Intern C', email: `intern.${pharmacy.id}@p.com`, role: StaffRole.STAFF, username: `c_${pharmacy.id.substring(0, 4)}`, password: passwordHash },
                ]
            });

            // 6. INVENTORY & BATCHES (Random 500-1500 items)
            const inventorySize = 500 + Math.floor(Math.random() * 1000);
            console.log(`   🛒 Stocking ${inventorySize} items for ${pharmacy.name}...`);

            // Randomly select items
            const shuffled = allCatalogItems.sort(() => 0.5 - Math.random());
            const selectedItems = shuffled.slice(0, inventorySize);

            for (const item of selectedItems) {
                const inv = await prisma.pharmacyInventory.create({
                    data: {
                        pharmacyId: pharmacy.id,
                        globalCatalogId: item.id,
                        name: item.name,
                        categoryId: categoryIds[0], // Simplified
                        minStockLevel: 10,
                        totalStockLevel: 300, // 3 batches * 100
                        isActive: true
                    }
                });

                // Units (Box/Pill)
                await prisma.inventoryUnit.createMany({
                    data: [
                        { inventoryId: inv.id, name: 'Box', conversionFactor: 1, price: Number(item.unitPrice) * 1.2, isBaseUnit: true, isDefaultSelling: true },
                        { inventoryId: inv.id, name: 'Carton', conversionFactor: 10, price: Number(item.unitPrice) * 12, isBaseUnit: false }
                    ]
                });

                // Batches (Expired, Near, Future)
                const now = new Date();
                const expiredDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // -30 days
                const nearDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // +10 days
                const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 year

                await prisma.inventoryBatch.createMany({
                    data: [
                        { inventoryId: inv.id, batchCode: 'EXP-001', stockQuantity: 50, expiryDate: expiredDate, purchasePrice: Number(item.unitPrice) },
                        { inventoryId: inv.id, batchCode: 'NEAR-002', stockQuantity: 100, expiryDate: nearDate, purchasePrice: Number(item.unitPrice) },
                        { inventoryId: inv.id, batchCode: 'NEW-003', stockQuantity: 150, expiryDate: futureDate, purchasePrice: Number(item.unitPrice) }
                    ]
                });
            }
        }
    }

    console.log('🏁 SEEDING COMPLETE! DATABASE IS READY FOR BENCHMARK.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

// List account chùa, pass là 123456 hết
// Mẹ Thư: admin@pharmacy-saas.com
// Owners: Big Corp 2 nhà thuốc: typhu@pharmacy.com
// SME 1 nhà thuốc: sme@pharmacy.com
// Startup 1 nhà thuốc: startup@pharmacy.com`
// Staffs: 
// Mỗi nhà thuốc sẽ có 3 nhân viên với email theo định dạng:
// manager.[ID_NHÀ_THUỐC]@p.com
// pharmacist.[ID_NHÀ_THUỐC]@p.com
// intern.[ID_NHÀ_THUỐC]@p.com

