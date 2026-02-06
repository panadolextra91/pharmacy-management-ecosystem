"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFactory = void 0;
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
// Helper to generate unique emails/phones
const unique = (prefix) => `${prefix}_${(0, uuid_1.v4)().slice(0, 8)}`;
// Pre-hash password for test consistency
const TEST_PASSWORD = 'Password123!';
let hashedPassword;
exports.TestFactory = {
    prisma,
    // Initialize hashed password (call once before tests)
    async init() {
        hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    },
    async resetDb() {
        // Order matters due to FK constraints
        const tablenames = await prisma.$queryRaw `SELECT tablename FROM pg_tables WHERE schemaname='public'`;
        for (const { tablename } of tablenames) {
            if (tablename !== '_prisma_migrations') {
                try {
                    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
                }
                catch (error) {
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
    async createPharmaRep(supplierId) {
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
        if (!hashedPassword)
            await this.init();
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
    async createPharmacy(ownerId) {
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
    async createPharmacyStaff(pharmacyId, role = 'STAFF') {
        if (!hashedPassword)
            await this.init();
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
    async createGlobalMedicine(supplierId, repId) {
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
    async createInventoryItem(pharmacyId, globalMedicineId) {
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
    async createBatch(inventoryId, quantity, daysExpiry, purchasePrice = 1000) {
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
        if (!hashedPassword)
            await this.init();
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
//# sourceMappingURL=factories.js.map