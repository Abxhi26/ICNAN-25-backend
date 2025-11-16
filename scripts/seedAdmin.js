// backend/scripts/seedStaff.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const adminUsers = [
    {
        staffId: 'ADMIN001',
        name: 'Admin User',
        email: 'admin@event.com',
        password: 'admin123',
        role: 'ADMIN'
    }
];

const coordinators = [
    {
        staffId: 'COORD001',
        name: 'John Doe - Main Hall',
        email: 'john.coord@event.com',
        password: 'coord123',
        role: 'COORDINATOR'
    },
    {
        staffId: 'COORD002',
        name: 'Jane Smith - Registration',
        email: 'jane.coord@event.com',
        password: 'coord123',
        role: 'COORDINATOR'
    },
    {
        staffId: 'COORD003',
        name: 'Mike Johnson - Security',
        email: 'mike.coord@event.com',
        password: 'coord123',
        role: 'COORDINATOR'
    }
];

const allStaff = [...adminUsers, ...coordinators];

async function seedStaff() {
    console.log('🔄 Connecting to database and creating Admin + Coordinators...\n');
    await prisma.$connect();

    try {
        for (const staffData of allStaff) {
            const hashedPassword = await bcrypt.hash(staffData.password, 10);

            const staff = await prisma.staff.upsert({
                where: { staffId: staffData.staffId },
                update: {
                    name: staffData.name,
                    email: staffData.email,
                    password: hashedPassword,
                    role: staffData.role
                },
                create: {
                    staffId: staffData.staffId,
                    name: staffData.name,
                    email: staffData.email,
                    password: hashedPassword,
                    role: staffData.role
                }
            });

            // only show password when not in production
            console.log(`✅ ${staff.role}: ${staff.name}`);
            console.log(`   Staff ID: ${staff.staffId}`);
            console.log(`   Email: ${staff.email}`);
            console.log(`   Password: ${process.env.NODE_ENV === 'production' ? '[hidden]' : staffData.password}\n`);
        }

        console.log('✅ All staff accounts processed successfully!');
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

seedStaff();
