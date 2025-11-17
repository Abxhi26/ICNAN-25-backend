const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const { authenticateToken, requireRole } = require('./middleware/auth.js');

const prisma = new PrismaClient();
const app = express();

app.use(cors({
    origin: 'https://icnan25-frontend.vercel.app/', // CHANGE to your deployed frontend domain
    credentials: true,
}));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// AUTH ROUTES
app.post('/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password are required' });
        const staff = await prisma.staff.findFirst({
            where: { OR: [{ email: identifier }, { staffId: identifier }] }
        });
        if (!staff) return res.status(401).json({ error: 'Invalid credentials' });
        const validPassword = await bcrypt.compare(password, staff.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: staff.id, role: staff.role, staffId: staff.staffId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                staffId: staff.staffId,
                role: staff.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PARTICIPANTS
app.get('/participants/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: 'Search query is required' });
        const searchTerm = query.trim().toLowerCase();
        const all = await prisma.participant.findMany();
        const filtered = all.filter(p =>
            (p.email || '').toLowerCase().includes(searchTerm) ||
            (p.mobileNo || '').toLowerCase().includes(searchTerm) ||
            (p.referenceNo || '').toLowerCase().includes(searchTerm) ||
            (p.name || '').toLowerCase().includes(searchTerm)
        ).slice(0, 10);
        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/participants', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const participants = await prisma.participant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(participants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/upload-excel', authenticateToken, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        let imported = 0, errors = [];
        for (const row of data) {
            try {
                const referenceNo = row['Reference No.']?.toString() || '';
                const email = row['E-Mail']?.toString() || '';
                if (!referenceNo || !email) {
                    errors.push(`Skipped row: Missing reference number or email`);
                    continue;
                }
                await prisma.participant.upsert({
                    where: { referenceNo },
                    update: {
                        prefix: row['Prefix']?.toString() || '',
                        name: row['Name']?.toString() || '',
                        gender: row['Gender']?.toString() || '',
                        designation: row['Designation']?.toString() || '',
                        institution: row['Institution']?.toString() || '',
                        instituteAddress: row['Institute Address']?.toString() || '',
                        state: row['State']?.toString() || '',
                        country: row['Country']?.toString() || '',
                        email,
                        mobileNo: row['Mobile No.']?.toString() || '',
                        registeredCategory: row['Registered Category']?.toString() || '',
                        paperId: row['Paper Id']?.toString() || '',
                        registrationDate: row['Registration Date']?.toString() || '',
                        transactionId: row['Transaction Id']?.toString() || '',
                        invoiceNo: row['Invoice No.']?.toString() || '',
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    },
                    create: {
                        referenceNo,
                        prefix: row['Prefix']?.toString() || '',
                        name: row['Name']?.toString() || '',
                        gender: row['Gender']?.toString() || '',
                        designation: row['Designation']?.toString() || '',
                        institution: row['Institution']?.toString() || '',
                        instituteAddress: row['Institute Address']?.toString() || '',
                        state: row['State']?.toString() || '',
                        country: row['Country']?.toString() || '',
                        email,
                        mobileNo: row['Mobile No.']?.toString() || '',
                        registeredCategory: row['Registered Category']?.toString() || '',
                        paperId: row['Paper Id']?.toString() || '',
                        registrationDate: row['Registration Date']?.toString() || '',
                        transactionId: row['Transaction Id']?.toString() || '',
                        invoiceNo: row['Invoice No.']?.toString() || '',
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    }
                });
                imported++;
            } catch (err) {
                errors.push(`Error importing ${row['Reference No.']}: ${err.message}`);
            }
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: `${imported} participants imported`, errors: errors.length > 0 ? errors : undefined });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BARCODE
app.post('/assign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email, barcode } = req.body;
        if (!email || !barcode) return res.status(400).json({ error: 'Email and barcode are required' });
        const existing = await prisma.participant.findFirst({ where: { barcode, NOT: { email } } });
        if (existing) return res.status(400).json({ error: 'This barcode is already assigned to another participant' });
        const participant = await prisma.participant.update({ where: { email }, data: { barcode } });
        res.json({ message: 'Barcode assigned', participant: { email: participant.email, name: participant.name, barcode: participant.barcode } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/deassign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const participant = await prisma.participant.update({ where: { email }, data: { barcode: null } });
        res.json({ message: 'Barcode removed', participant: { email: participant.email, name: participant.name } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ENTRY
app.post('/mark-entry', authenticateToken, async (req, res) => {
    try {
        const { barcode, venue } = req.body;
        if (!barcode || !venue) return res.status(400).json({ error: 'Barcode and venue are required' });
        const participant = await prisma.participant.findUnique({ where: { barcode } });
        if (!participant) return res.status(404).json({ error: 'Invalid barcode. Participant not found.' });
        const existingEntry = await prisma.entry.findFirst({ where: { participantId: participant.id, venue } });
        if (existingEntry) return res.status(400).json({ error: 'Entry already marked for this venue', timestamp: existingEntry.timestamp });
        const entry = await prisma.entry.create({
            data: { participantId: participant.id, venue, staffId: req.user.staffId }
        });
        res.json({ success: true, message: 'Entry marked successfully', participant: { name: participant.name, email: participant.email, referenceNo: participant.referenceNo }, entry: { venue: entry.venue, timestamp: entry.timestamp } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/entries/:barcode', authenticateToken, async (req, res) => {
    try {
        const { barcode } = req.params;
        const participant = await prisma.participant.findUnique({
            where: { barcode },
            include: { entries: { orderBy: { timestamp: 'desc' } } }
        });
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        res.json({ participant: { name: participant.name, email: participant.email, referenceNo: participant.referenceNo }, entries: participant.entries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/entries/all', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const { venue, date } = req.query;
        let whereClause = {};
        if (venue && venue !== 'all') whereClause.venue = venue;
        if (date) {
            const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
            whereClause.timestamp = { gte: startOfDay, lte: endOfDay };
        }
        const entries = await prisma.entry.findMany({
            where: whereClause,
            include: {
                participant: { select: { referenceNo: true, name: true, email: true, mobileNo: true, institution: true, registeredCategory: true, barcode: true } }
            },
            orderBy: { timestamp: 'desc' }
        });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/entries/stats', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const totalEntries = await prisma.entry.count();
        const entriesByVenue = await prisma.entry.groupBy({
            by: ['venue'],
            _count: { id: true }
        });
        const uniqueParticipants = await prisma.entry.findMany({ distinct: ['participantId'] });
        res.json({
            totalEntries,
            uniqueParticipants: uniqueParticipants.length,
            entriesByVenue: entriesByVenue.map(v => ({ venue: v.venue, count: v._count.id }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HOME
app.get('/', (req, res) => {
    res.json({ message: 'Smart Entry Validation API is running! (Stage 1)' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Stage 1: Core Entry System Active`);
});
