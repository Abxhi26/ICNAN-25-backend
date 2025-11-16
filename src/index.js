// backend/src/index.js
// Smart Entry Validation System - main server entry
// Assumes route modules exist: ./routes/auth, ./routes/participants, ./routes/entries
// and middleware ./middleware/auth

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads'); // backend/uploads
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed origins (comma separated env var)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// sensible default origins for local dev (will be used only if none supplied)
if (allowedOrigins.length === 0) {
    allowedOrigins.push(
        'http://localhost:5173',
        'http://localhost:3000'
    );
}

// CORS
app.use(cors({
    origin: (origin, callback) => {
        // allow non-browser tools (no origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn('Blocked CORS origin:', origin);
        return callback(new Error('CORS not allowed by server'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

// Allow preflight for everything
app.options('*', (req, res) => res.sendStatus(204));

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach prisma client to every request for route modules to consume
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

// Serve uploaded files (if needed) - optional, careful in prod
app.use('/uploads', express.static(UPLOAD_DIR));

// Mount routes (these modules should export an express router)
try {
    const authRoutes = require('./routes/auth');
    const participantRoutes = require('./routes/participants');
    const entriesRoutes = require('./routes/entries');

    app.use('/auth', authRoutes);
    app.use('/participants', participantRoutes);
    app.use('/entries', entriesRoutes);
} catch (err) {
    console.error('Failed to mount some routes. Make sure route files exist and export an express router.', err);
    // don't exit - continue so health checks still respond and startup logs help debugging
}

// Basic health / info
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Entry Validation API (Stage 1)',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Generic 404 for unknown api routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/participants') || req.path.startsWith('/entries')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    next();
});

// Generic error handler (so thrown errors return JSON)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start server and connect to DB
let serverInstance;
(async function start() {
    try {
        await prisma.$connect();
        serverInstance = app.listen(PORT, () => {
            console.log(`✅ Smart Entry Validation API running on port ${PORT}`);
            console.log(` - Uploads dir: ${UPLOAD_DIR}`);
            console.log(` - Allowed origins: ${allowedOrigins.join(', ')}`);
        });

        // handle uncaught exceptions/rejections to attempt graceful shutdown
        process.on('unhandledRejection', (reason) => {
            console.error('Unhandled Rejection:', reason);
        });
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();

// Graceful shutdown
async function shutdown(signal) {
    try {
        console.log(`\nReceived ${signal || 'signal'} - shutting down...`);
        if (serverInstance && serverInstance.close) {
            serverInstance.close(() => {
                console.log('HTTP server closed');
            });
        }
        await prisma.$disconnect();
        console.log('Prisma disconnected');
        process.exit(0);
    } catch (e) {
        console.error('Error during shutdown', e);
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export app for tests or serverless wrappers
module.exports = app;
