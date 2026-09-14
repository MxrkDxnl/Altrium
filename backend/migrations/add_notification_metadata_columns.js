const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

async function migrate() {
  console.log('================================================================');
  console.log('MIGRATION: Add Notification Metadata Columns (Guarded)');
  console.log('================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3309,
    user: process.env.DB_USER || 'altrium_app_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'altrium_fresh_db'
  });

  try {
    const [cols] = await connection.execute('DESCRIBE `notifications`');
    const colNames = cols.map(c => c.Field);
    console.log('Existing columns in `notifications`:', colNames);

    if (!colNames.includes('link')) {
      console.log('Adding column `link`...');
      await connection.execute('ALTER TABLE `notifications` ADD COLUMN `link` VARCHAR(255) NULL DEFAULT NULL AFTER `is_read`');
      console.log('✅ Column `link` added.');
    } else {
      console.log('Column `link` already exists.');
    }

    if (!colNames.includes('entity_type')) {
      console.log('Adding column `entity_type`...');
      await connection.execute('ALTER TABLE `notifications` ADD COLUMN `entity_type` VARCHAR(50) NULL DEFAULT NULL AFTER `link`');
      console.log('✅ Column `entity_type` added.');
    } else {
      console.log('Column `entity_type` already exists.');
    }

    if (!colNames.includes('entity_id')) {
      console.log('Adding column `entity_id`...');
      await connection.execute('ALTER TABLE `notifications` ADD COLUMN `entity_id` INT NULL DEFAULT NULL AFTER `entity_type`');
      console.log('✅ Column `entity_id` added.');
    } else {
      console.log('Column `entity_id` already exists.');
    }

    const [updatedCols] = await connection.execute('DESCRIBE `notifications`');
    console.log('\nUpdated table structure:');
    console.table(updatedCols);

    console.log('\nMigration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
