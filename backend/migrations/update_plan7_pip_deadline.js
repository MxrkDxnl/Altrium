/**
 * Migration: Update Plan 7 PIP Deadline to 12-Month Anniversary (2027-09-09)
 * 
 * Confirmed Rule:
 * For protected Plan 7:
 * - Assignment timestamp: 2026-09-08T20:58:17.000Z (Asia/Colombo: September 9, 2026)
 * - Last permitted submission date: September 9, 2027 (2027-09-09)
 * - Exclusive cutoff: September 10, 2027 at 00:00:00 +05:30
 * - Old stored due_date: 2026-10-31
 * - New approved due_date: 2027-09-09
 */

const path = require('path');
const mysql = require('../node_modules/mysql2/promise');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('=== Starting Migration: Update Plan 7 PIP 12-Month Deadline ===');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 3309;
  const user = process.env.DB_USER || 'altrium_app_user';
  const database = process.env.DB_NAME || 'altrium_fresh_db';

  console.log(`Target database: ${user}@${host}:${port}/${database}`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password: process.env.DB_PASSWORD,
    database
  });

  try {
    // 1. Inspect existing Plan 7
    const [plan7Rows] = await conn.execute(
      'SELECT id, title, type, manager_id, recipient_id, quarter, year, due_date, status, createdAt FROM plans WHERE id = 7'
    );

    if (plan7Rows.length === 0) {
      throw new Error('Plan 7 not found in database!');
    }

    const plan7 = plan7Rows[0];
    console.log('\n--- Current Plan 7 Record ---');
    console.log(plan7);

    if (plan7.type !== 'PIP') {
      throw new Error(`Plan 7 is not a PIP (found type: ${plan7.type})`);
    }

    // 2. Perform guarded update of due_date to 2027-09-09
    console.log('\nUpdating Plan 7 due_date to 2027-09-09...');
    const [updateResult] = await conn.execute(
      "UPDATE plans SET due_date = '2027-09-09', updatedAt = NOW() WHERE id = 7 AND type = 'PIP'"
    );

    console.log(`Update result: ${updateResult.affectedRows} row(s) updated.`);

    // 3. Verify updated Plan 7 record
    const [verifiedRows] = await conn.execute(
      'SELECT id, title, type, manager_id, recipient_id, quarter, year, due_date, status, createdAt, updatedAt FROM plans WHERE id = 7'
    );
    console.log('\n--- Verified Plan 7 Record ---');
    console.log(verifiedRows[0]);

    // 4. Verify Plan 40 and overall plan count
    const [allPlans] = await conn.execute('SELECT id, title, type, status, due_date FROM plans');
    console.log('\n--- All Plans in Database ---');
    console.log(allPlans);

    console.log('\n=== Migration Completed Successfully ===');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = runMigration;
