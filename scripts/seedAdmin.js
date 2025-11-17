const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('adminpassword', 10); // change password as needed

    // Admin account
    await prisma.staff.upsert({
        where: { staffId: 'ADMIN01' },
        update: {},
        create: {
            staffId: 'ADMIN01',
            name: 'Conference Admin',
            email: 'admin@conference.com',
            password,
            role: 'ADMIN',
        },
    });

    // Example coordinator account
    await prisma.staff.upsert({
        where: { staffId: 'STAFF01' },
        update: {},
        create: {
            staffId: 'STAFF01',
            name: 'Staff User',
            email: 'coordinator@conference.com',
            password: await bcrypt.hash('staffpassword', 10),
            role: 'COORDINATOR',
        },
    });

    console.log('✅ Seeded admin and coordinator users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
