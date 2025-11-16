// backend/src/routes/participants.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const upload = multer({ dest: uploadDir });

function safeUnlink(p) { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {/*ignore*/ } }

router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || !query.trim()) return res.status(400).json({ error: 'Search query required' });
        const term = query.trim();
        const prisma = req.prisma;
        const found = await prisma.participant.findMany({
            where: {
                OR: [
                    { email: { contains: term, mode: 'insensitive' } },
                    { mobileNo: { contains: term, mode: 'insensitive' } },
                    { referenceNo: { contains: term, mode: 'insensitive' } },
                    { name: { contains: term, mode: 'insensitive' } },
                    { barcode: { contains: term, mode: 'insensitive' } }
                ]
            },
            take: 25,
            orderBy: { createdAt: 'desc' }
        });
        res.json(found);
    } catch (err) {
        console.error('Search error', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/', requireRole('ADMIN'), async (req, res) => {
    try {
        const prisma = req.prisma;
        const parts = await prisma.participant.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(parts);
    } catch (err) {
        console.error('Fetch participants', err);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

router.post('/upload-excel', requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        let imported = 0, errors = [];
        for (const [idx, row] of rows.entries()) {
            try {
                const referenceNo = (row['Reference No.'] || row.referenceNo || row['ReferenceNo'] || '').toString().trim();
                const email = (row['E-Mail'] || row.email || '').toString().trim();
                if (!referenceNo || !email) {
                    errors.push({ row: idx + 1, error: 'Missing Reference No or E-Mail' });
                    continue;
                }
                await req.prisma.participant.upsert({
                    where: { referenceNo },
                    update: {
                        prefix: row['Prefix'] || row.prefix || '',
                        name: row['Name'] || row.name || '',
                        gender: row['Gender'] || row.gender || '',
                        designation: row['Designation'] || row.designation || '',
                        institution: row['Institution'] || row.institution || '',
                        instituteAddress: row['Institute Address'] || row.instituteAddress || '',
                        state: row['State'] || row.state || '',
                        country: row['Country'] || row.country || '',
                        email,
                        mobileNo: row['Mobile No.'] || row.mobileNo || '',
                        registeredCategory: row['Registered Category'] || row.registeredCategory || '',
                        paperId: row['Paper Id'] || row.paperId || '',
                        registrationDate: row['Registration Date'] || row.registrationDate || '',
                        transactionId: row['Transaction Id'] || row.transactionId || '',
                        invoiceNo: row['Invoice No.'] || row.invoiceNo || '',
                        amountPaid: row['Amount Paid (INR)'] ? parseFloat(row['Amount Paid (INR)']) : (row.amountPaid ? parseFloat(row.amountPaid) : null)
                    },
                    create: {
                        referenceNo,
                        prefix: row['Prefix'] || row.prefix || '',
                        name: row['Name'] || row.name || '',
                        gender: row['Gender'] || row.gender || '',
                        designation: row['Designation'] || row.designation || '',
                        institution: row['Institution'] || row.institution || '',
                        instituteAddress: row['Institute Address'] || row.instituteAddress || '',
                        state: row['State'] || row.state || '',
                        country: row['Country'] || row.country || '',
                        email,
                        mobileNo: row['Mobile No.'] || row.mobileNo || '',
                        registeredCategory: row['Registered Category'] || row.registeredCategory || '',
                        paperId: row['Paper Id'] || row.paperId || '',
                        registrationDate: row['Registration Date'] || row.registrationDate || '',
                        transactionId: row['Transaction Id'] || row.transactionId || '',
                        invoiceNo: row['Invoice No.'] || row.invoiceNo || '',
                        amountPaid: row['Amount Paid (INR)'] ? parseFloat(row['Amount Paid (INR)']) : (row.amountPaid ? parseFloat(row.amountPaid) : null)
                    }
                });
                imported++;
            } catch (e) {
                errors.push({ row: idx + 1, error: e.message });
            }
        }

        safeUnlink(req.file.path);
        res.json({ message: `${imported} participants imported.`, imported, errors });
    } catch (err) {
        safeUnlink(req.file && req.file.path);
        console.error('Excel upload error', err);
        res.status(500).json({ error: 'Excel import failed' });
    }
});

router.post('/assign-barcode', async (req, res) => {
    try {
        const { email, barcode } = req.body;
        if (!email || !barcode) return res.status(400).json({ error: 'Email & barcode required' });

        // check uniqueness
        const existing = await req.prisma.participant.findFirst({ where: { barcode, NOT: { email } } });
        if (existing) return res.status(400).json({ error: 'Barcode already assigned to another participant' });

        const p = await req.prisma.participant.update({ where: { email }, data: { barcode } });
        res.json({ message: 'Assigned', participant: p });
    } catch (err) {
        console.error('Assign barcode', err);
        res.status(500).json({ error: 'Assign barcode failed' });
    }
});

router.post('/deassign-barcode', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        const p = await req.prisma.participant.update({ where: { email }, data: { barcode: null } });
        res.json({ message: 'Deassigned', participant: p });
    } catch (err) {
        console.error('Deassign barcode', err);
        res.status(500).json({ error: 'Deassign failed' });
    }
});

module.exports = router;
