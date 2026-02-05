import { PrismaClient, OwnerStatus, StaffRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting MASTER Seeding Process...');

    // 1. CLEANUP (Dọn dẹp dữ liệu cũ theo thứ tự để tránh lỗi khóa ngoại)
    const deleteOrder = [
        prisma.reminderLog.deleteMany(),
        prisma.reminderNotification.deleteMany(),
        prisma.medicineReminder.deleteMany(),
        prisma.orderItem.deleteMany(),
        prisma.invoiceItem.deleteMany(),
        prisma.cartItem.deleteMany(),
        prisma.inventoryBatch.deleteMany(),
        prisma.inventoryUnit.deleteMany(),
        prisma.purchaseItem.deleteMany(),
        prisma.purchaseInvoice.deleteMany(),
        prisma.pharmacyInventory.deleteMany(),
        prisma.pharmacyOrder.deleteMany(),
        prisma.pharmacyInvoice.deleteMany(),
        prisma.staffNotification.deleteMany(),
        prisma.pharmacyStaff.deleteMany(),
        prisma.storageLocation.deleteMany(),
        prisma.pharmacy.deleteMany(),
        prisma.owner.deleteMany(),
        prisma.globalMedicineCatalog.deleteMany(),
        prisma.pharmaSalesRep.deleteMany(),
        prisma.supplier.deleteMany(),
        prisma.category.deleteMany(),
        prisma.brand.deleteMany(),
        prisma.systemAdmin.deleteMany(),
    ];

    await prisma.$transaction(deleteOrder);
    console.log('🧹 Database cleaned successfully.');

    // 2. TẠO SYSTEM ADMIN (GOD MODE)
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.systemAdmin.create({
        data: {
            email: 'admin@pharmacy-saas.com',
            password: adminPassword,
            name: 'Super Admin (Mẹ Thư)',
        },
    });
    console.log('👑 System Admin created: admin@pharmacy-saas.com / admin123');

    // 3. TẠO GLOBAL DATA (Danh mục dùng chung)
    // Category
    const catPain = await prisma.category.create({ data: { name: 'Giảm Đau / Hạ Sốt' } });
    const catAnti = await prisma.category.create({ data: { name: 'Kháng Sinh' } });
    console.log('📁 Categories created.');

    // Supplier
    const supplier = await prisma.supplier.create({
        data: {
            name: 'Dược Hậu Giang (DHG)',
            address: 'Cần Thơ',
            contactInfo: { phone: '0292-3890-890', email: 'info@dhgpharma.vn' }
        },
    });
    console.log('🏭 Supplier created: DHG Pharma');

    // PharmaSalesRep - PHẢI TẠO TRƯỚC KHI TẠO CATALOG
    const salesRep = await prisma.pharmaSalesRep.create({
        data: {
            name: 'Nguyễn Văn Sales',
            email: 'sales@dhgpharma.vn',
            phone: '0901234567',
            supplierId: supplier.id,
        },
    });
    console.log('👔 Pharma Sales Rep created.');

    // Global Catalog (Thuốc mẫu)
    const panadol = await prisma.globalMedicineCatalog.create({
        data: {
            name: 'Panadol Extra',
            manufacturer: 'GSK',
            activeIngredient: 'Paracetamol 500mg, Caffeine 65mg',
            packaging: 'Hộp 15 vỉ x 12 viên',
            unitPrice: 180000,
            categoryId: catPain.id,
            supplierId: supplier.id,
            pharmaRepId: salesRep.id, // ✅ Dùng ID thực
        },
    });

    const augmentin = await prisma.globalMedicineCatalog.create({
        data: {
            name: 'Augmentin 625mg',
            manufacturer: 'GSK',
            activeIngredient: 'Amoxicillin, Clavulanic acid',
            packaging: 'Hộp 2 vỉ x 7 viên',
            unitPrice: 200000,
            categoryId: catAnti.id,
            supplierId: supplier.id,
            pharmaRepId: salesRep.id, // ✅ Dùng ID thực
        },
    });
    console.log('📚 Global Catalog seeded (Panadol, Augmentin).');

    // 4. TẠO OWNER & PHARMACY & INVENTORY (Dữ liệu Tenant)
    const userPassword = await bcrypt.hash('123456', 10);

    // Tạo Owner đã được Approve
    const owner = await prisma.owner.create({
        data: {
            email: 'owner@gmail.com',
            password: userPassword,
            name: 'Nguyễn Văn Chủ',
            phone: '0909111222',
            status: OwnerStatus.ACTIVE, // Active để demo ngay!
            subscriptionExpiry: new Date('2030-01-01'),
        }
    });
    console.log('👤 Owner created: owner@gmail.com / 123456');

    // Tạo Pharmacy
    const pharmacy = await prisma.pharmacy.create({
        data: {
            ownerId: owner.id,
            name: 'Nhà Thuốc An Khang 1',
            address: '123 Cách Mạng Tháng 8, Q3, TP.HCM',
            phone: '0909123456',
            latitude: 10.7769,
            longitude: 106.6951,
            hours: {
                monday: '08:00-22:00',
                tuesday: '08:00-22:00',
                wednesday: '08:00-22:00',
                thursday: '08:00-22:00',
                friday: '08:00-22:00',
                saturday: '08:00-20:00',
                sunday: '09:00-18:00'
            },
        },
    });
    console.log('🏪 Pharmacy created: Nhà Thuốc An Khang 1');

    // Tạo Staff
    await prisma.pharmacyStaff.create({
        data: {
            pharmacyId: pharmacy.id,
            name: 'Trần Quản Lý',
            email: 'manager@pharmacy.com',
            password: userPassword,
            username: 'manager',
            role: StaffRole.MANAGER,
        },
    });

    await prisma.pharmacyStaff.create({
        data: {
            pharmacyId: pharmacy.id,
            name: 'Lê Dược Sĩ',
            email: 'pharmacist@pharmacy.com',
            password: userPassword,
            username: 'pharmacist',
            role: StaffRole.PHARMACIST,
        },
    });
    console.log('👥 Staff created: manager@pharmacy.com, pharmacist@pharmacy.com / 123456');

    // Tạo Inventory + Batches (Quan trọng cho FIFO testing!)
    // Thuốc 1: Panadol với 2 lô
    const inventoryPanadol = await prisma.pharmacyInventory.create({
        data: {
            pharmacyId: pharmacy.id,
            name: 'Panadol Extra (Tại kho)',
            globalCatalogId: panadol.id,
            categoryId: catPain.id,
            totalStockLevel: 1500,
            minStockLevel: 100,
            image: 'https://placehold.co/400x400/FF0000/FFFFFF?text=Panadol',
        },
    });

    // Tạo Units cho Panadol
    await prisma.inventoryUnit.createMany({
        data: [
            { inventoryId: inventoryPanadol.id, name: 'Hộp', conversionFactor: 180, price: 250000, isBaseUnit: false },
            { inventoryId: inventoryPanadol.id, name: 'Vỉ', conversionFactor: 12, price: 20000, isBaseUnit: false, isDefaultSelling: true },
            { inventoryId: inventoryPanadol.id, name: 'Viên', conversionFactor: 1, price: 2000, isBaseUnit: true },
        ],
    });

    // Tạo Batches cho Panadol (TEST FIFO!)
    await prisma.inventoryBatch.createMany({
        data: [
            {
                inventoryId: inventoryPanadol.id,
                batchCode: 'LÔ-CŨ-2025',
                expiryDate: new Date('2026-05-01'), // Sắp hết hạn -> Xuất trước!
                stockQuantity: 500,
                purchasePrice: 150000, // Giá vốn rẻ
            },
            {
                inventoryId: inventoryPanadol.id,
                batchCode: 'LÔ-MỚI-2026',
                expiryDate: new Date('2028-01-01'), // Còn hạn lâu -> Xuất sau
                stockQuantity: 1000,
                purchasePrice: 180000, // Giá vốn đắt hơn (Test Snapshot Pricing)
            },
        ],
    });

    // Thuốc 2: Augmentin (Cố tình để minStock > totalStock để test cảnh báo)
    const inventoryAugmentin = await prisma.pharmacyInventory.create({
        data: {
            pharmacyId: pharmacy.id,
            name: 'Augmentin 625mg (Tại kho)',
            globalCatalogId: augmentin.id,
            categoryId: catAnti.id,
            totalStockLevel: 50, // Ít hơn minStock!
            minStockLevel: 100, // Trigger Low Stock Alert
            image: 'https://placehold.co/400x400/0000FF/FFFFFF?text=Augmentin',
        },
    });

    await prisma.inventoryUnit.create({
        data: {
            inventoryId: inventoryAugmentin.id,
            name: 'Hộp',
            conversionFactor: 1,
            price: 250000,
            isBaseUnit: true,
        },
    });

    await prisma.inventoryBatch.create({
        data: {
            inventoryId: inventoryAugmentin.id,
            batchCode: 'AUG-001',
            expiryDate: new Date('2027-01-01'),
            stockQuantity: 50,
            purchasePrice: 200000,
        },
    });

    console.log('💊 Inventory seeded with 2 products + batches (FIFO ready!)');

    // 5. TẠO CUSTOMER MẪU
    await prisma.customer.create({
        data: {
            phone: '0909999888',
            fullName: 'Khách Hàng Demo',
            email: 'customer@gmail.com',
            verified: true,
            verifiedAt: new Date(),
        },
    });
    console.log('🛒 Customer created: 0909999888');

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ MASTER SEED COMPLETE!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   System Admin: admin@pharmacy-saas.com / admin123');
    console.log('   Owner:        owner@gmail.com / 123456');
    console.log('   Manager:      manager@pharmacy.com / 123456');
    console.log('   Pharmacist:   pharmacist@pharmacy.com / 123456');
    console.log('');
    console.log('📦 INVENTORY READY:');
    console.log('   - Panadol Extra: 1500 units (2 batches for FIFO)');
    console.log('   - Augmentin: 50 units (LOW STOCK ALERT!)');
    console.log('═══════════════════════════════════════════');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
