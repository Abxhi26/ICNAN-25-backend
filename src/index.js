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

// Middleware
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// ===== AUTHENTICATION ROUTES =====

// Staff Login - using staffId or email
app.post('/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        console.log('=== STAFF LOGIN ATTEMPT ===');
        console.log('Identifier:', identifier);

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier and password are required' });
        }

        // Find staff by staffId or email
        const staff = await prisma.staff.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { staffId: identifier }
                ]
            }
        });

        if (!staff) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, staff.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: staff.id, role: staff.role, staffId: staff.staffId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful:', staff.email, 'Role:', staff.role);

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
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== PARTICIPANT ROUTES =====

// Search participants
app.get('/participants/search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.query;

        console.log('=== SEARCH PARTICIPANTS ===');
        console.log('Query:', query);

        if (!query || query.trim() === '') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = query.trim().toLowerCase();

        const allParticipants = await prisma.participant.findMany({
            select: {
                id: true,
                referenceNo: true,
                prefix: true,
                name: true,
                gender: true,
                designation: true,
                institution: true,
                instituteAddress: true,
                state: true,
                country: true,
                email: true,
                mobileNo: true,
                registeredCategory: true,
                paperId: true,
                registrationDate: true,
                transactionId: true,
                invoiceNo: true,
                amountPaid: true,
                barcode: true
            }
        });

        const participants = allParticipants.filter(p => {
            const email = (p.email || '').toLowerCase();
            const mobile = (p.mobileNo || '').toLowerCase();
            const refNo = (p.referenceNo || '').toLowerCase();
            const name = (p.name || '').toLowerCase();

            return email.includes(searchTerm) ||
                mobile.includes(searchTerm) ||
                refNo.includes(searchTerm) ||
                name.includes(searchTerm);
        }).slice(0, 10);

        console.log('Found participants:', participants.length);

        res.json(participants);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all participants (Admin only)
app.get('/participants', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const participants = await prisma.participant.findMany({
            select: {
                id: true,
                referenceNo: true,
                name: true,
                email: true,
                mobileNo: true,
                institution: true,
                registeredCategory: true,
                amountPaid: true,
                registrationDate: true,
                barcode: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(participants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload Excel - participants only (Admin only)
app.post('/upload-excel', authenticateToken, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log('=== EXCEL UPLOAD ===');
        console.log('Total rows:', data.length);

        let imported = 0;
        let errors = [];

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
                        email: email,
                        mobileNo: row['Mobile No.']?.toString() || '',
                        registeredCategory: row['Registered Category']?.toString() || '',
                        paperId: row['Paper Id']?.toString() || '',
                        registrationDate: row['Registration Date']?.toString() || '',
                        transactionId: row['Transaction Id']?.toString() || '',
                        invoiceNo: row['Invoice No.']?.toString() || '',
                        amountPaid: parseFloat(row['Amount Paid (INR)']) || 0
                    },
                    create: {
                        referenceNo: referenceNo,
                        prefix: row['Prefix']?.toString() || '',
                        name: row['Name']?.toString() || '',
                        gender: row['Gender']?.toString() || '',
                        designation: row['Designation']?.toString() || '',
                        institution: row['Institution']?.toString() || '',
                        instituteAddress: row['Institute Address']?.toString() || '',
                        state: row['State']?.toString() || '',
                        country: row['Country']?.toString() || '',
                        email: email,
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
                console.error(`Error importing ${row['Reference No.']}:`, err.message);
                errors.push(`Error importing ${row['Reference No.']}: ${err.message}`);
            }
        }

        fs.unlinkSync(req.file.path);

        console.log(`=== UPLOAD COMPLETE: ${imported} imported ===`);

        res.json({
            message: `${imported} participants imported successfully`,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== BARCODE ROUTES =====

// Assign barcode
app.post('/assign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email, barcode } = req.body;

        console.log('=== ASSIGN BARCODE ===');
        console.log('Email:', email);
        console.log('Barcode:', barcode);

        if (!email || !barcode) {
            return res.status(400).json({ error: 'Email and barcode are required' });
        }

        // Check if barcode already exists
        const existingBarcode = await prisma.participant.findFirst({
            where: {
                barcode: barcode,
                NOT: { email: email }
            }
        });

        if (existingBarcode) {
            return res.status(400).json({
                error: 'This barcode is already assigned to another participant'
            });
        }

        const participant = await prisma.participant.update({
            where: { email },
            data: { barcode }
        });

        console.log('Barcode assigned successfully');

        res.json({
            message: 'Barcode assigned successfully',
            participant: {
                email: participant.email,
                name: participant.name,
                barcode: participant.barcode
            }
        });
    } catch (error) {
        console.error('Assign barcode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// De-assign barcode
app.post('/deassign-barcode', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const participant = await prisma.participant.update({
            where: { email },
            data: { barcode: null }
        });

        res.json({
            message: 'Barcode removed successfully',
            participant: {
                email: participant.email,
                name: participant.name
            }
        });
    } catch (error) {
        console.error('Deassign barcode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ENTRY MARKING ROUTES =====

// Mark entry
app.post('/mark-entry', authenticateToken, async (req, res) => {
    try {
        const { barcode, venue } = req.body;

        console.log('=== MARK ENTRY ===');
        console.log('Barcode:', barcode);
        console.log('Venue:', venue);
        console.log('Staff ID:', req.user.staffId);

        if (!barcode || !venue) {
            return res.status(400).json({ error: 'Barcode and venue are required' });
        }

        // Find participant by barcode
        const participant = await prisma.participant.findUnique({
            where: { barcode }
        });

        if (!participant) {
            return res.status(404).json({ error: 'Invalid barcode. Participant not found.' });
        }

        // Check if already entered this venue
        const existingEntry = await prisma.entry.findFirst({
            where: {
                participantId: participant.id,
                venue: venue
            }
        });

        if (existingEntry) {
            return res.status(400).json({
                error: 'Entry already marked for this venue',
                timestamp: existingEntry.timestamp
            });
        }

        // Create entry record
        const entry = await prisma.entry.create({
            data: {
                participantId: participant.id,
                venue: venue,
                staffId: req.user.staffId
            }
        });

        console.log('Entry marked successfully');

        res.json({
            success: true,
            message: 'Entry marked successfully',
            participant: {
                name: participant.name,
                email: participant.email,
                referenceNo: participant.referenceNo
            },
            entry: {
                venue: entry.venue,
                timestamp: entry.timestamp
            }
        });
    } catch (error) {
        console.error('Mark entry error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get entry history for a participant
app.get('/entries/:barcode', authenticateToken, async (req, res) => {
    try {
        const { barcode } = req.params;

        const participant = await prisma.participant.findUnique({
            where: { barcode },
            include: {
                entries: {
                    orderBy: {
                        timestamp: 'desc'
                    }
                }
            }
        });

        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        res.json({
            participant: {
                name: participant.name,
                email: participant.email,
                referenceNo: participant.referenceNo
            },
            entries: participant.entries
        });
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all entry logs (Admin only)
app.get('/entries/all', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const { venue, date } = req.query;

        console.log('=== GET ALL ENTRIES ===');
        console.log('Filters - Venue:', venue, 'Date:', date);

        let whereClause = {};

        // Filter by venue if provided
        if (venue && venue !== 'all') {
            whereClause.venue = venue;
        }

        // Filter by date if provided
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            whereClause.timestamp = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const entries = await prisma.entry.findMany({
            where: whereClause,
            include: {
                participant: {
                    select: {
                        referenceNo: true,
                        name: true,
                        email: true,
                        mobileNo: true,
                        institution: true,
                        registeredCategory: true,
                        barcode: true
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        console.log('Total entries found:', entries.length);

        res.json(entries);
    } catch (error) {
        console.error('Get all entries error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get entry statistics (Admin only)
app.get('/entries/stats', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const totalEntries = await prisma.entry.count();

        const entriesByVenue = await prisma.entry.groupBy({
            by: ['venue'],
            _count: {
                id: true
            }
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
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Smart Entry Validation API is running! (Stage 1)' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Stage 1: Core Entry System Active`);
});
