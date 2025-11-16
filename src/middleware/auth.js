// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

/**
 * authenticateToken
 * - reads Authorization: Bearer <token>
 * - attaches req.user = { userId, role, staffId } when valid
 */
function authenticateToken(req, res, next) {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (!auth) return res.status(401).json({ error: 'Missing authorization header' });

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid auth format' });

    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

/**
 * requireRole(requiredRole)
 * - middleware factory to enforce role (ADMIN or COORDINATOR)
 * - requiredRole can be a single string or an array of allowed roles
 */
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
