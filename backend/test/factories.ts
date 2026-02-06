import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper to generate unique emails/phones
const unique = (prefix: string) => `${prefix}_${uuidv4().slice(0, 8)}`;

// Pre-hash password for test consistency
const TEST_PASSWORD = 'Password123!';
let hashedPassword: string;

export const TestFactory = {
    prisma,

    // Initialize hashed password (call once before tests)
    async init() {
        hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    },

    async resetDb() {
        // Order matters due to FK constraints
        const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

        for (const { tablename } of tablenames) {
            if (tablename !== '_prisma_migrations') {
                try {
                    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
                } catch (error) {
                    console.log(`Error cleaning table ${tablename}`, error);
                }
            }
        }
    },

    async createSupplier() {
        return prisma.supplier.create({
            data: {
                name: unique('Supplier'),
                contactInfo: {},
                address: '123 Test St',
            },
        });
    },

    async createPharmaRep(supplierId: string) {
        return prisma.pharmaSalesRep.create({
            data: {
                name: unique('Rep'),
                email: unique('rep') + '@test.com',
                phone: unique('090'),
                supplierId,
                isVerified: true,
            },
        });
    },

    async createPharmacyOwner() {
        if (!hashedPassword) await this.init();
        return prisma.owner.create({
            data: {
                name: unique('Owner'),
                email: unique('owner') + '@test.com',
                phone: unique('091'),
                password: hashedPassword, // Proper bcrypt hash for login tests
                status: 'ACTIVE',
            },
        });
    },

    async createPharmacy(ownerId: string) {
        return prisma.pharmacy.create({
            data: {
                name: unique('Pharmacy'),
                address: '123 Test Ave',
                phone: unique('028'),
                ownerId,
                isActive: true,
                latitude: 10.762622,
                longitude: 106.660172,
                hours: {},
            },
        });
    },

    async createPharmacyStaff(pharmacyId: string, role: 'STAFF' | 'PHARMACIST' | 'MANAGER' = 'STAFF') {
        if (!hashedPassword) await this.init();
        return prisma.pharmacyStaff.create({
            data: {
                name: unique('Staff'),
                email: unique('staff') + '@test.com',
                username: unique('staff'),
                password: hashedPassword,
                pharmacyId,
                role,
                isActive: true,
            },
        });
    },

    async createGlobalMedicine(supplierId: string, repId: string) {
        return prisma.globalMedicineCatalog.create({
            data: {
                name: unique('Panadol'),
                supplierId,
                pharmaRepId: repId,
                status: 'APPROVED',
                unitPrice: 1000,
            },
        });
    },

    async createInventoryItem(pharmacyId: string, globalMedicineId: string) {
        return prisma.pharmacyInventory.create({
            data: {
                pharmacyId,
                globalCatalogId: globalMedicineId,
                name: unique('InventoryItem'),
                totalStockLevel: 0,
                minStockLevel: 10,
                units: {
                    create: [{
                        name: 'Box',
                        conversionFactor: 1,
                        price: 100,
                        isBaseUnit: true,
                        isDefaultSelling: true
                    }]
                }
            },
            include: { units: true },
        });
    },

    async createBatch(inventoryId: string, quantity: number, daysExpiry: number, purchasePrice = 1000) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysExpiry);

        const batch = await prisma.inventoryBatch.create({
            data: {
                inventoryId,
                batchCode: unique('BATCH'),
                stockQuantity: quantity,
                expiryDate,
                purchasePrice,
            },
        });

        await prisma.pharmacyInventory.update({
            where: { id: inventoryId },
            data: { totalStockLevel: { increment: quantity } },
        });

        return batch;
    },

    async createCustomer() {
        if (!hashedPassword) await this.init();
        return prisma.customer.create({
            data: {
                fullName: unique('Customer'),
                phone: unique('090'),
                email: unique('cust') + '@test.com',
                password: hashedPassword, // Allow password login
                verified: true,
            },
        });
    },
};
