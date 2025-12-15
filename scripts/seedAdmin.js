const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    async function upsertStaff(staffId, name, email, plainPassword, role) {
        const hashed = await bcrypt.hash(plainPassword, 10);
        await prisma.staff.upsert({
            where: { staffId },
            update: { name, email, password: hashed, role },
            create: { staffId, name, email, password: hashed, role },
        });
    }

    // ---- Existing Admins ----
    await upsertStaff('ADMIN01', 'Conference Admin', 'admin@conference.com', 'adminpassword', 'ADMIN');
    await upsertStaff('ADMIN02', 'Conference Admin', 'abhiramaravind3@gmail.com', 'abhiram@123', 'ADMIN');
    await upsertStaff('ADMIN03', 'Conference Admin', 'drisanth03@gmail.com', 'dris@123', 'ADMIN');
    await upsertStaff('ADMIN04', 'Conference Admin', 'keerthanag1369@gmail.com', 'kiki@123', 'ADMIN');
    await upsertStaff('ADMIN05', 'Conference Admin', 'manaswitha2003@gmail.com', 'manu@123', 'ADMIN');
    await upsertStaff('ADMIN06', 'Conference Admin', 'gourijn007@gmail.com', 'gori@123', 'ADMIN');

    // ---- Example coordinator (kept as-is) ----
    await upsertStaff('STAFF01', 'Staff User', 'coordinator@conference.com', 'staffpassword', 'COORDINATOR');

    // ---- New staff accounts ----
    await upsertStaff('STAFF02', 'Staff User', 'archaajesh.k2023@vitstudent.ac.in', 'archaajesh.k2023', 'STAFF');
    await upsertStaff('STAFF03', 'Staff User', 'narayan.h2023@vitstudent.ac.in', 'narayan.h2023', 'STAFF');
    await upsertStaff('STAFF04', 'Staff User', 'lisateresa.abraham2023@vitstudent.ac.in', 'lisateresa.abraham2023', 'STAFF');
    await upsertStaff('STAFF05', 'Staff User', 'abhilash.2023@vitstudent.ac.in', 'abhilash.2023', 'STAFF');
    await upsertStaff('STAFF06', 'Staff User', 'aman.em2023@vitstudent.ac.in', 'aman.em2023', 'STAFF');
    await upsertStaff('STAFF07', 'Staff User', 'joedavis.ukken2023@vitstudent.ac.in', 'joedavis.ukken2023', 'STAFF');
    await upsertStaff('STAFF08', 'Staff User', 'gayathri.2024a@vitstudent.ac.in', 'gayathri.2024a', 'STAFF');
    await upsertStaff('STAFF09', 'Staff User', 'angela.smattam2024@vitstudent.ac.in', 'angela.smattam2024', 'STAFF');
    await upsertStaff('STAFF10', 'Staff User', 'febin.as2024@vitstudent.ac.in', 'febin.as2024', 'STAFF');
    await upsertStaff('STAFF11', 'Staff User', 'sarath.vs2024@vitstudent.ac.in', 'sarath.vs2024', 'STAFF');
    await upsertStaff('STAFF12', 'Staff User', 'abhiram.aravind2022@vitstudent.ac.in', 'abhiram.aravind2022', 'STAFF');
    await upsertStaff('STAFF13', 'Staff User', 'aaron.eapen2024@vitstudent.ac.in', 'aaron.eapen2024', 'STAFF');
    await upsertStaff('STAFF14', 'Staff User', 'amrutha.k2022@vitstudent.ac.in', 'amrutha.k2022', 'STAFF');
    await upsertStaff('STAFF15', 'Staff User', 'chiragahuja9896@gmail.com', 'chiragahuja9896', 'STAFF');
    await upsertStaff('STAFF16', 'Staff User', 'bhavana.ji2022@vitstudent.ac.in', 'bhavana.ji2022', 'STAFF');
    await upsertStaff('STAFF17', 'Staff User', 'sowmiya.s2023@vitstudent.ac.in', 'sowmiya.s2023', 'STAFF');
    await upsertStaff('STAFF18', 'Staff User', 'kommanaboyina.srav2024@vitstudent.ac.in', 'kommanaboyina.srav2024', 'STAFF');
    await upsertStaff('STAFF19', 'Staff User', 'akshay.muralidharan2022@vitstudent.ac.in', 'akshay.muralidharan2022', 'STAFF');
    await upsertStaff('STAFF20', 'Staff User', 'durgabhavani469@gmail.com', 'durgabhavani469', 'STAFF');
    await upsertStaff('STAFF21', 'Staff User', 'dhiyanusumathii@gmail.com', 'dhiyanusumathii', 'STAFF');
    await upsertStaff('STAFF22', 'Staff User', 'kowshikavijayan4199@gmail.com', 'kowshikavijayan4199', 'STAFF');
    await upsertStaff('STAFF23', 'Staff User', 'manaswini.ks2025@vitstudent.ac.in', 'manaswini.ks2025', 'STAFF');
    await upsertStaff('STAFF24', 'Staff User', 'vanishree.p@vit.ac.in', 'vanishree.p', 'STAFF');

    console.log('✅ Seeded admin, coordinator, and staff users.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
