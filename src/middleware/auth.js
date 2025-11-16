// backend/src/middleware/auth.js
// Robust auth middleware with optional fallback secret (safe short-term)
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_FALLBACK = process.env.JWT_SECRET_FALLBACK || null;

function maskToken(t) {
    if (!t) return '';
    return t.slice(0, 8) + '...' + t.slice(-8);
}

async function verifyWithFallback(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (primaryErr) {
        // Only try fallback if configured and primary failed
        if (JWT_FALLBACK) {
            try {
                return jwt.verify(token, JWT_FALLBACK);
            } catch (fallbackErr) {
                // both failed — throw primary error for consistent behavior
                throw primaryErr;
            }
        }
        throw primaryErr;
    }
}

function authenticateToken(req, res, next) {
    try {
        const auth = req.headers['authorization'] || req.headers['Authorization'];
        if (!auth) return res.status(401).json({ error: 'Not authenticated' });

        const parts = auth.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const token = parts[1];
        // Verify token (will try fallback if configured)
        let payload;
        try {
            payload = verifyWithFallback(token);
            // If verifyWithFallback returned a Promise (noop) ensure synchronous behavior
            if (payload && typeof payload.then === 'function') {
                payload.then(p => { req.user = p; next(); }).catch(err => {
                    console.warn('Auth verify failed (async)'); return res.status(401).json({ error: 'Not authenticated' });
                });
                return;
            }
        } catch (err) {
            // Do not leak err.message to client
            console.warn('Auth verify failed for token:', maskToken(token));
            return res.status(401).json({ error: 'Not authenticated' });
        }

        req.user = payload;
        return next();
    } catch (e) {
        console.error('Auth middleware unexpected error', e && (e.stack || e));
        return res.status(500).json({ error: 'Server error' });
    }
}

function requireRole(required) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        const allowed = Array.isArray(required) ? required : [required];
        if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden - insufficient role' });
        next();
    };
}

module.exports = { authenticateToken, requireRole };
