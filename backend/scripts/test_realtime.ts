
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function main() {
    console.log('🚀 INITIALIZING REAL-TIME TEST SIMULATION...');
    console.log('--------------------------------------------------');

    try {
        // 1. Find a Target Pharmacy (with Stock)
        // Ensure we pick one from the Seed data (e.g., Big Corp Branch 1)
        const pharmacy = await prisma.pharmacy.findFirst({
            where: {
                name: { contains: 'Branch 1' },
                inventory: { some: { totalStockLevel: { gt: 100 } } }
            },
            include: { staff: true }
        });

        if (!pharmacy) throw new Error('❌ No suitable Pharmacy found. Run seed first!');
        console.log(`🏥 Target Pharmacy: ${pharmacy.name}`);

        // 2. Find Manager Credentials
        const manager = pharmacy.staff.find(s => s.role === 'MANAGER');
        if (!manager) throw new Error('❌ Manager not found for this pharmacy');

        console.log(`👤 Manager Email:   ${manager.email}`);

        // 3. Login to get Token
        console.log('🔑 Logging in as Manager...');
        const loginRes = await axios.post(`${API_URL}/auth/staff/login`, {
            email: manager.email,
            password: '123456'
        });

        const token = loginRes.data.data.accessToken;
        if (!token) throw new Error('❌ Login failed - No token returned');

        console.log('\n👇 COPY THIS TOKEN TO SOCKET CLIENT 👇');
        console.log('--------------------------------------------------');
        console.log(token);
        console.log('--------------------------------------------------');
        console.log('ℹ️  Go to browser -> Paste Token -> Click Connect');
        console.log('⏳ Waiting 20 seconds for you to connect...');

        await new Promise(r => setTimeout(r, 20000));

        // 4. Prepare Order Data
        // 4.1 Create Dummy Customer
        let customer = await prisma.customer.findFirst({ where: { phone: '0999888777' } });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    phone: '0999888777',
                    fullName: 'Mr. Socket Tester',
                    verified: true
                }
            });
            console.log('👤 created Dummy Customer: Mr. Socket Tester');
        }

        // 4.2 Find Inventory Item
        const inventory = await prisma.pharmacyInventory.findFirst({
            where: { pharmacyId: pharmacy.id, totalStockLevel: { gt: 10 } },
            include: { units: true }
        });

        if (!inventory) throw new Error('❌ No inventory with stock found');

        // Use Base Unit
        const unit = inventory.units.find(u => u.isBaseUnit) || inventory.units[0];

        // 5. Fire Order
        console.log('\n🚀 FIRING NEW ORDER (Check your browser now!)...');

        try {
            const orderRes = await axios.post(`${API_URL}/sales/orders`, {
                pharmacyId: pharmacy.id,
                customerId: customer.id,
                items: [
                    {
                        inventoryId: inventory.id,
                        unitId: unit.id,
                        quantity: 1
                    }
                ],
                paymentMethod: 'CASH',
                isPosSale: true // Simulating POS sale
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log(`✅ Order Created! ID: ${orderRes.data.data.id}`);
            console.log(`💰 Total: ${orderRes.data.data.totalAmount}`);
            console.log('🎉 VERIFICATION COMPLETE!');

        } catch (err: any) {
            console.error('❌ Failed to create order:', err.response?.data || err.message);
        }

    } catch (error: any) {
        console.error('❌ Script Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
