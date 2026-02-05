import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed Super Admin (God Mode) - Only run once!
 * Usage: npx ts-node prisma/seed-admin.ts
 */
async function main() {
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@pharmacy-saas.com';
    const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecure@2026!';
    const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    // Check if already exists
    const existing = await prisma.systemAdmin.findUnique({
        where: { email: SUPER_ADMIN_EMAIL }
    });

    if (existing) {
        console.log('⚠️  Super Admin already exists:', SUPER_ADMIN_EMAIL);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    // Create Super Admin
    const admin = await prisma.systemAdmin.create({
        data: {
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            name: SUPER_ADMIN_NAME,
        }
    });

    console.log('✅ Super Admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.name);
    console.log('');
    console.log('🔐 IMPORTANT: Change the password after first login!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
