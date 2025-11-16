// backend/src/routes/entries.js
const express = require('express');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// POST /mark-entry
router.post('/mark', async (req, res) => {
    try {
        const { barcode, venue } = req.body;
        if (!barcode || !venue) return res.status(400).json({ error: 'Barcode & venue required' });

        const participant = await req.prisma.participant.findUnique({ where: { barcode } });
        if (!participant) return res.status(404).json({ error: 'Invalid barcode' });

        // optional: prevent duplicate entries same day for same venue
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const existing = await req.prisma.entry.findFirst({
            where: {
                participantId: participant.id,
                venue,
                timestamp: { gte: todayStart, lte: todayEnd }
            }
        });
        if (existing) return res.status(400).json({ error: 'Already entered today', timestamp: existing.timestamp });

        const entry = await req.prisma.entry.create({
            data: { participantId: participant.id, venue, staffId: req.user?.staffId || null }
        });
        res.json({ success: true, entry, participant });
    } catch (err) {
        console.error('Mark entry error', err);
        res.status(500).json({ error: 'Mark entry failed' });
    }
});

// GET /history/:barcode
router.get('/history/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        const participant = await req.prisma.participant.findUnique({
            where: { barcode },
            include: { entries: { orderBy: { timestamp: 'desc' } } }
        });
        if (!participant) return res.status(404).json({ error: 'Participant not found' });
        res.json({ participant, entries: participant.entries });
    } catch (err) {
        console.error('Entry history error', err);
        res.status(500).json({ error: 'History fetch failed' });
    }
});

// GET /stats
router.get('/stats', requireRole('ADMIN'), async (req, res) => {
    try {
        const totalEntries = await req.prisma.entry.count();
        const entriesByVenue = await req.prisma.entry.groupBy({ by: ['venue'], _count: { id: true } });
        const uniqueParticipants = await req.prisma.entry.findMany({ distinct: ['participantId'] });
        res.json({
            totalEntries,
            uniqueParticipants: uniqueParticipants.length,
            entriesByVenue: entriesByVenue.map(v => ({ venue: v.venue, count: v._count.id }))
        });
    } catch (err) {
        console.error('Stats error', err);
        res.status(500).json({ error: 'Stats fetch failed' });
    }
});

module.exports = router;
