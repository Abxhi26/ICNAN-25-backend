// ===============================
//        IMPORTS & SETUP
// ===============================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const { authenticateToken, requireRole } = require('./middleware/auth');

const prisma = new PrismaClient();
const app = express();

// ===============================
//        CORS CONFIGURATION
// ===============================
// During deployment: FRONTEND_URL = https://your-frontend.vercel.app
app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
}));

// Middleware
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// ===============================
//        AUTHENTICATION ROUTES
// ===============================

// Staff Login (Email or Staff ID)
app.post('/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier & password required' });
        }

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
            {
                userId: staff.id,
                role: staff.role,
                staffId: staff.staffId
            },
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
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
//        PARTICIPANT ROUTES
// ===============================

// Search participants
app.get('/participants/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim() === "") {
            return res.status(400).json({ error: "Search query is required" });
        }

        const searchTerm = query.toLowerCase().trim();

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
        console.error("Search error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get all participants (Admin)
app.get('/participants', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const participants = await prisma.participant.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(participants);
    } catch (err) {
        console.error("Participants fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Upload participant Excel
app.post('/upload-excel', authenticateToken, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        let imported = 0;
        let errors = [];

        for (const row of data) {
            try {
                const referenceNo = row['Reference No.']?.toString();
                const email = row['E-Mail']?.toString();

                if (!referenceNo || !email) {
                    errors.push("Missing Reference No. or E-Mail");
                    continue;
                }

                await prisma.participant.upsert({
                    where: { referenceNo },
                    update: {
                        prefix: row['Prefix'] || "",
                        name: row['Name'] || "",
                        gender: row['Gender'] || "",
                        designation: row['Designation'] || "",
                        institution: row['Institution'] || "",
                        instituteAddress: row['Institute Address'] || "",
                        state: row['State'] || "",
                        country: row['Country'] || "",
                        email: row['E-Mail'] || "",
                        mobileNo: row['Mobile No.'] || "",
                        registeredCategory: row['Registered Category'] || "",
                        paperId: row['Paper Id'] || "",
                        registrationDate: row['Registration Date'] || "",
                        transactionId: row['Transaction Id'] || "",
                        invoiceNo: row['Invoice No.'] || "",
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    },
                    create: {
                        referenceNo,
                        prefix: row['Prefix'] || "",
                        name: row['Name'] || "",
                        gender: row['Gender'] || "",
                        designation: row['Designation'] || "",
                        institution: row['Institution'] || "",
                        instituteAddress: row['Institute Address'] || "",
                        state: row['State'] || "",
                        country: row['Country'] || "",
                        email,
                        mobileNo: row['Mobile No.'] || "",
                        registeredCategory: row['Registered Category'] || "",
                        paperId: row['Paper Id'] || "",
                        registrationDate: row['Registration Date'] || "",
                        transactionId: row['Transaction Id'] || "",
                        invoiceNo: row['Invoice No.'] || "",
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    }
                });

                imported++;

            } catch (e) {
                errors.push(e.message);
            }
        }

        fs.unlinkSync(req.file.path);

        res.json({
            message: `${imported} participants imported.`,
            errors
        });

    } catch (err) {
        console.error("Excel upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
//        BARCODE ROUTES
// ===============================

// Assign barcode
app.post('/assign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email, barcode } = req.body;

        if (!email || !barcode)
            return res.status(400).json({ error: "Email & barcode are required" });

        const existing = await prisma.participant.findFirst({
            where: { barcode, NOT: { email } }
        });

        if (existing) {
            return res.status(400).json({ error: "Barcode already assigned" });
        }

        const participant = await prisma.participant.update({
            where: { email },
            data: { barcode }
        });

        res.json({ message: "Barcode assigned", participant });

    } catch (err) {
        console.error("Barcode assign error:", err);
        res.status(500).json({ error: err.message });
    }
});

// De-assign barcode
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
        console.error("Deassign error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
//        ENTRY ROUTES
// ===============================

// Mark entry
app.post('/mark-entry', authenticateToken, async (req, res) => {
    try {
        const { barcode, venue } = req.body;

        if (!barcode || !venue)
            return res.status(400).json({ error: "Barcode & venue required" });

        const participant = await prisma.participant.findUnique({
            where: { barcode }
        });

        if (!participant)
            return res.status(404).json({ error: 'Invalid barcode' });

        const existingEntry = await prisma.entry.findFirst({
            where: { participantId: participant.id, venue }
        });

        if (existingEntry)
            return res.status(400).json({ error: 'Already entered', timestamp: existingEntry.timestamp });

        const entry = await prisma.entry.create({
            data: {
                participantId: participant.id,
                venue,
                staffId: req.user.staffId
            }
        });

        res.json({
            success: true,
            message: "Entry recorded",
            participant,
            entry
        });

    } catch (err) {
        console.error("Entry marking error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Entry history by barcode
app.get('/entries/:barcode', authenticateToken, async (req, res) => {
    try {
        const { barcode } = req.params;

        const participant = await prisma.participant.findUnique({
            where: { barcode },
            include: { entries: { orderBy: { timestamp: 'desc' } } }
        });

        if (!participant)
            return res.status(404).json({ error: 'Participant not found' });

        res.json({ participant, entries: participant.entries });

    } catch (err) {
        console.error("Entry history error:", err);
        res.status(500).json({ error: err.message });
    }
});

// All entries (Admin)
app.get('/entries/all', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const { venue, date } = req.query;

        let where = {};

        if (venue && venue !== "all") where.venue = venue;

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            where.timestamp = { gte: start, lte: end };
        }

        const entries = await prisma.entry.findMany({
            where,
            include: { participant: true },
            orderBy: { timestamp: 'desc' }
        });

        res.json(entries);

    } catch (err) {
        console.error("All entries error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Stats
app.get('/entries/stats', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const totalEntries = await prisma.entry.count();

        const entriesByVenue = await prisma.entry.groupBy({
            by: ['venue'],
            _count: { id: true }
        });

        const uniqueParticipants = await prisma.entry.findMany({
            distinct: ['participantId']
        });

        res.json({
            totalEntries,
            uniqueParticipants: uniqueParticipants.length,
            entriesByVenue: entriesByVenue.map(v => ({
                venue: v.venue,
                count: v._count.id
            }))
        });

    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===============================
//        TEST ROUTE
// ===============================
app.get('/', (req, res) => {
    res.json({ message: "Smart Entry Validation API is running! (Stage 1)" });
});

// ===============================
//        START SERVER
// ===============================
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Smart Entry System Live`);
});
