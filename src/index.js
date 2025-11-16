// backend/src/index.js
// Complete server entry for Smart Entry Validation System

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { authenticateToken, requireRole } = require('./middleware/auth');

const prisma = new PrismaClient();
const app = express();

// Make sure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer setup
const upload = multer({
    dest: UPLOAD_DIR,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// ===============================
// CORS configuration
// ===============================
// Set ALLOWED_ORIGINS in environment as comma-separated list,
// e.g. ALLOWED_ORIGINS=https://icnan2025-frontend.vercel.app,http://localhost:5173
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// default helpful origins for development if none provided
if (allowedOrigins.length === 0) {
    allowedOrigins.push(
        'http://localhost:5173',
        'http://localhost:3000',
        'https://icnan2025-frontend.vercel.app',
        'https://icnan-25-backend.onrender.com'
    );
}

app.use(cors({
    origin: (origin, callback) => {
        // allow non-browser tools (no origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn('Blocked CORS origin:', origin);
        return callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    credentials: true,
    preflightContinue: false
}));

// respond quickly to preflight requests
app.options('*', (req, res) => res.sendStatus(204));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// Helper: safe file unlink
// ===============================
function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.warn('Failed to remove file:', filePath, e.message);
    }
}

// ===============================
// AUTH ROUTES
// ===============================
app.post('/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) return res.status(400).json({ error: 'Identifier & password required' });

        const staff = await prisma.staff.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { staffId: identifier }
                ]
            }
        });

        if (!staff) return res.status(401).json({ error: 'Invalid credentials' });

        const passwordValid = await bcrypt.compare(password, staff.password);
        if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

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
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===============================
// PARTICIPANT ROUTES
// ===============================

// Search participants (protected)
app.get('/participants/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || !query.trim()) return res.status(400).json({ error: 'Search query is required' });

        const searchTerm = query.trim();

        const participants = await prisma.participant.findMany({
            where: {
                OR: [
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                    { mobileNo: { contains: searchTerm, mode: 'insensitive' } },
                    { referenceNo: { contains: searchTerm, mode: 'insensitive' } },
                    { name: { contains: searchTerm, mode: 'insensitive' } }
                ]
            },
            take: 10
        });

        res.json(participants);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all participants (admin)
app.get('/participants', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const participants = await prisma.participant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(participants);
    } catch (err) {
        console.error('Participants fetch error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload Excel (admin)
app.post('/upload-excel', authenticateToken, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        let imported = 0;
        const errors = [];

        for (const row of data) {
            try {
                const referenceNo = row['Reference No.']?.toString();
                const email = row['E-Mail']?.toString();

                if (!referenceNo || !email) {
                    errors.push('Missing Reference No. or E-Mail in a row');
                    continue;
                }

                await prisma.participant.upsert({
                    where: { referenceNo },
                    update: {
                        prefix: row['Prefix'] || '',
                        name: row['Name'] || '',
                        gender: row['Gender'] || '',
                        designation: row['Designation'] || '',
                        institution: row['Institution'] || '',
                        instituteAddress: row['Institute Address'] || '',
                        state: row['State'] || '',
                        country: row['Country'] || '',
                        email: row['E-Mail'] || '',
                        mobileNo: row['Mobile No.'] || '',
                        registeredCategory: row['Registered Category'] || '',
                        paperId: row['Paper Id'] || '',
                        registrationDate: row['Registration Date'] || '',
                        transactionId: row['Transaction Id'] || '',
                        invoiceNo: row['Invoice No.'] || '',
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    },
                    create: {
                        referenceNo,
                        prefix: row['Prefix'] || '',
                        name: row['Name'] || '',
                        gender: row['Gender'] || '',
                        designation: row['Designation'] || '',
                        institution: row['Institution'] || '',
                        instituteAddress: row['Institute Address'] || '',
                        state: row['State'] || '',
                        country: row['Country'] || '',
                        email,
                        mobileNo: row['Mobile No.'] || '',
                        registeredCategory: row['Registered Category'] || '',
                        paperId: row['Paper Id'] || '',
                        registrationDate: row['Registration Date'] || '',
                        transactionId: row['Transaction Id'] || '',
                        invoiceNo: row['Invoice No.'] || '',
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    }
                });

                imported++;
            } catch (e) {
                console.error('Row import error:', e);
                errors.push(e.message || 'Row import failed');
            }
        }

        // remove uploaded file
        safeUnlink(req.file.path);

        res.json({ message: `${imported} participants imported.`, errors });

    } catch (err) {
        console.error('Excel upload error:', err);
        // try to clean up file if present
        if (req?.file?.path) safeUnlink(req.file.path);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===============================
// BARCODE ROUTES
// ===============================

app.post('/assign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email, barcode } = req.body;
        if (!email || !barcode) return res.status(400).json({ error: 'Email & barcode required' });

        const existing = await prisma.participant.findFirst({
            where: { barcode, NOT: { email } }
        });

        if (existing) return res.status(400).json({ error: 'Barcode already assigned' });

        const participant = await prisma.participant.update({
            where: { email },
            data: { barcode }
        });

        res.json({ message: 'Barcode assigned', participant });
    } catch (err) {
        console.error('Assign barcode error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/deassign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const participant = await prisma.participant.update({
            where: { email },
            data: { barcode: null }
        });

        res.json({ message: 'Barcode removed', participant });
    } catch (err) {
        console.error('Deassign error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===============================
// ENTRY ROUTES
// ===============================

app.post('/mark-entry', authenticateToken, async (req, res) => {
    try {
        const { barcode, venue } = req.body;
        if (!barcode || !venue) return res.status(400).json({ error: 'Barcode & venue required' });

        const participant = await prisma.participant.findUnique({ where: { barcode } });
        if (!participant) return res.status(404).json({ error: 'Invalid barcode' });

        const existingEntry = await prisma.entry.findFirst({
            where: { participantId: participant.id, venue }
        });

        if (existingEntry) return res.status(400).json({ error: 'Already entered', timestamp: existingEntry.timestamp });

        const entry = await prisma.entry.create({
            data: {
                participantId: participant.id,
                venue,
                staffId: req.user.staffId
            }
        });

        res.json({ success: true, message: 'Entry recorded', participant, entry });
    } catch (err) {
        console.error('Entry marking error:', err);
        res.status(500).json({ error: 'Server error' });
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

        res.json({ participant, entries: participant.entries });
    } catch (err) {
        console.error('Entry history error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/entries/all', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const { venue, date } = req.query;
        const where = {};

        if (venue && venue !== 'all') where.venue = venue;
        if (date) {
            const start = new Date(date); start.setHours(0, 0, 0, 0);
            const end = new Date(date); end.setHours(23, 59, 59, 999);
            where.timestamp = { gte: start, lte: end };
        }

        const entries = await prisma.entry.findMany({
            where,
            include: { participant: true },
            orderBy: { timestamp: 'desc' }
        });

        res.json(entries);
    } catch (err) {
        console.error('All entries error:', err);
        res.status(500).json({ error: 'Server error' });
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
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===============================
// Test route
// ===============================
app.get('/', (req, res) => {
    res.json({ message: 'Smart Entry Validation API is running! (Stage 1)' });
});

// ===============================
// Start server and graceful shutdown
// ===============================
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('📊 Smart Entry System Live');
});

async function shutdown() {
    console.log('Shutting down server...');
    try {
        await prisma.$disconnect();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    } catch (e) {
        console.error('Error during shutdown', e);
        process.exit(1);
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// export app for testing if needed
module.exports = app;
