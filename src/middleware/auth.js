const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // Get JWT token from header or cookie
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// Restrict route to role(s) (e.g. "ADMIN")
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role))
            return res.status(403).json({ error: 'Insufficient permissions' });
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole,
};
