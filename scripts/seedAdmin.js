const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedStaff() {
    console.log('🔄 Creating Admin and Coordinator accounts...\n');

    // Admin Users
    const adminUsers = [
        {
            staffId: 'ADMIN001',
            name: 'Admin User',
            email: 'admin@event.com',
            password: 'admin123',
            role: 'ADMIN'
        }
    ];

    // Coordinator Users
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

    for (const staffData of allStaff) {
        try {
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

            console.log(`✅ ${staff.role}: ${staff.name}`);
            console.log(`   Staff ID: ${staff.staffId}`);
            console.log(`   Email: ${staff.email}`);
            console.log(`   Password: ${staffData.password}\n`);
        } catch (error) {
            console.error(`❌ Error creating ${staffData.name}:`, error.message);
        }
    }

    console.log('✅ All staff accounts created successfully!');
}

seedStaff()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
