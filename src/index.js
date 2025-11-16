// backend/src/index.js
// Smart Entry Validation System - main server entry with robust CORS
'use strict';

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

// CONFIG
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads'); // backend/uploads
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ----- CORS configuration (robust) -----
// ALLOWED_ORIGINS: comma-separated list of exact origins, e.g.
// ALLOWED_ORIGINS=https://icnan25-frontend.vercel.app,http://localhost:5173
const rawAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

console.log('CORS: allowed origins:', rawAllowed.length ? rawAllowed : '[none configured]');

// cors options
const corsOptions = {
    origin: function (origin, callback) {
        // allow non-browser requests like curl/postman (no origin)
        if (!origin) {
            return callback(null, true);
        }

        // if no allowed origins configured, deny by default (safer)
        if (!rawAllowed.length) {
            console.warn('CORS: no allowed origins configured; blocking origin:', origin);
            return callback(new Error('CORS not allowed'), false);
        }

        // exact match required
        if (rawAllowed.includes(origin)) {
            return callback(null, true);
        }

        console.warn('CORS: blocked origin:', origin);
        return callback(new Error('CORS not allowed'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Make sure Express will respond to OPTIONS for all routes (preflight)
app.options('*', cors(corsOptions));

// ----- Body parsers -----
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach prisma to req
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

// Serve uploads if you want (optional)
app.use('/uploads', express.static(UPLOAD_DIR));

// ----- Route mounting (make sure these files exist) -----
// If any of these files are missing the server will log a helpful error
try {
    const authRoutes = require('./routes/auth'); // expected to export router
    const participantRoutes = require('./routes/participants');
    const entriesRoutes = require('./routes/entries');

    app.use('/auth', authRoutes);
    app.use('/participants', participantRoutes);
    app.use('/entries', entriesRoutes);

    console.log('Routes mounted: /auth, /participants, /entries');
} catch (err) {
    console.error('Failed to mount routes. Ensure ./routes/auth.js, ./routes/participants.js, ./routes/entries.js exist and export an express router.', err);
}

// Basic health endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Entry Validation API is running (Stage 1)',
        timestamp: new Date().toISOString(),
        allowedOrigins: rawAllowed
    });
});

// Generic 404 handler for unknown API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/auth') || req.path.startsWith('/participants') || req.path.startsWith('/entries')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    next();
});

// Generic error handler (sends JSON)
app.use((err, req, res, next) => {
    // If CORS blocked, the cors middleware passes an Error with message 'CORS not allowed'
    if (err && err.message && err.message.includes('CORS')) {
        return res.status(403).json({ error: 'CORS not allowed', detail: err.message });
    }

    console.error('Unhandled error:', err && (err.stack || err));
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ----- Start server and connect to DB -----
let serverInstance;
(async function start() {
    try {
        await prisma.$connect();
        serverInstance = app.listen(PORT, () => {
            console.log(`✅ Smart Entry Validation API running on port ${PORT}`);
            console.log(` - Uploads directory: ${UPLOAD_DIR}`);
            console.log(` - Allowed origins: ${rawAllowed.length ? rawAllowed.join(', ') : '[none]'}`);
        });

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

// ----- Graceful shutdown -----
async function shutdown(signal) {
    try {
        console.log(`\nReceived ${signal || 'signal'} - shutting down...`);
        if (serverInstance && serverInstance.close) {
            serverInstance.close(() => console.log('HTTP server closed'));
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
