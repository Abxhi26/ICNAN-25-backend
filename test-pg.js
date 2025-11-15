// test-pg.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
    console.log('--- START DB TEST ---');
    console.log('Masked DATABASE_URL:', (process.env.DATABASE_URL || '').replace(/:[^@]+@/, ' :***@'));

    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('Connected OK');
        const res = await client.query('SELECT version(), NOW()');
        console.log('version/time:', res.rows);
        await client.end();
        console.log('--- END DB TEST: SUCCESS ---');
        process.exit(0);
    } catch (err) {
        console.error('--- END DB TEST: ERROR ---');
        console.error('err.code =', err && err.code);
        console.error('err.message =', err && err.message);
        console.error('err.stack =', err && err.stack && err.stack.split('\\n').slice(0, 5).join('\\n'));
        process.exit(1);
    }
})();
