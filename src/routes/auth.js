// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ error: 'Identifier & password required' });

        const prisma = req.prisma;
        const staff = await prisma.staff.findFirst({
            where: { OR: [{ email: identifier }, { staffId: identifier }] }
        });
        if (!staff) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, staff.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: staff.id, role: staff.role, staffId: staff.staffId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        return res.json({
            token,
            user: { id: staff.id, name: staff.name, email: staff.email, staffId: staff.staffId, role: staff.role }
        });
    } catch (err) {
        console.error('Login error', err);
        return res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
