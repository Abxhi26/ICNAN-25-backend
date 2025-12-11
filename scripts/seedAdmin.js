const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Helper to upsert one staff user
    async function upsertStaff(staffId, name, email, plainPassword, role) {
        const hashed = await bcrypt.hash(plainPassword, 10);
        await prisma.staff.upsert({
            where: { staffId },
            update: { name, email, password: hashed, role },
            create: { staffId, name, email, password: hashed, role },
        });
    }

    // Admin accounts
    await upsertStaff('ADMIN01', 'Conference Admin', 'admin@conference.com', 'adminpassword', 'ADMIN');
    await upsertStaff('ADMIN02', 'Conference Admin', 'abhiramaravind3@gmail.com', 'abhiram@123', 'ADMIN');
    await upsertStaff('ADMIN03', 'Conference Admin', 'drisanth03@gmail.com', 'dris@123', 'ADMIN');
    await upsertStaff('ADMIN04', 'Conference Admin', 'keerthanag1369@gmail.com', 'kiki@123', 'ADMIN');
    await upsertStaff('ADMIN05', 'Conference Admin', 'manaswitha2003@gmail.com', 'manu@123', 'ADMIN');
    await upsertStaff('ADMIN06', 'Conference Admin', 'gourijn007@gmail.com', 'gori@123', 'ADMIN');

    // Example coordinator account
    await upsertStaff('STAFF01', 'Staff User', 'coordinator@conference.com', 'staffpassword', 'COORDINATOR');

    console.log('✅ Seeded admin and coordinator users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
