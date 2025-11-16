// backend/src/middleware/auth.js  (debug variant)
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

function maskToken(t) {
    if (!t) return '';
    return t.slice(0, 8) + '...' + t.slice(-8);
}

function authenticateToken(req, res, next) {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth) {
        console.warn('[AUTH] Missing Authorization header');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        console.warn('[AUTH] Invalid auth header format:', auth);
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        return next();
    } catch (err) {
        console.error('[AUTH] jwt.verify failed. token=', maskToken(token), 'error=', err && err.message);
        return res.status(401).json({ error: 'Not authenticated', detail: err.message });
    }
}

function requireRole(required) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const allowed = Array.isArray(required) ? required : [required];
        if (!allowed.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden - insufficient role' });
        }
        next();
    };
}

module.exports = { authenticateToken, requireRole, JWT_SECRET };
