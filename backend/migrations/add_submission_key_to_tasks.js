/**
 * backend/migrations/add_submission_key_to_tasks.js
 * Non-destructive migration to add submission_key and payload_hash to tasks table.
 */

const sequelize = require('../config/database');

async function migrate() {
  try {
    console.log('--- Checking tasks columns for submission_key and payload_hash ---');
    const [cols] = await sequelize.query('SHOW COLUMNS FROM tasks;');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('submission_key')) {
      console.log('Adding column `submission_key` VARCHAR(128) NULL...');
      await sequelize.query('ALTER TABLE tasks ADD COLUMN submission_key VARCHAR(128) NULL AFTER draft_content;');
      console.log('Column `submission_key` added.');
    } else {
      console.log('Column `submission_key` already exists.');
    }

    if (!colNames.includes('payload_hash')) {
      console.log('Adding column `payload_hash` VARCHAR(64) NULL...');
      await sequelize.query('ALTER TABLE tasks ADD COLUMN payload_hash VARCHAR(64) NULL AFTER submission_key;');
      console.log('Column `payload_hash` added.');
    } else {
      console.log('Column `payload_hash` already exists.');
    }

    console.log('--- Migration completed successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
