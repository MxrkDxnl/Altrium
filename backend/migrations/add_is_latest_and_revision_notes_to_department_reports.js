const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

async function migrate() {
  console.log('================================================================');
  console.log('MIGRATION: Add is_latest and revision_notes to department_reports (Guarded)');
  console.log('================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3309,
    user: process.env.DB_USER || 'altrium_app_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'altrium_fresh_db'
  });

  try {
    // 1. Verify table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'department_reports'");
    if (tables.length === 0) {
      console.log('Table `department_reports` does not exist yet. Please run create_department_reports_table.js first.');
      return;
    }

    // 2. Inspect existing columns
    const [columns] = await connection.execute('DESCRIBE `department_reports`');
    const existingColumns = new Set(columns.map(c => c.Field));

    let addedCount = 0;

    // 3. Guarded addition of revision_notes
    if (!existingColumns.has('revision_notes')) {
      console.log('Adding `revision_notes` column to `department_reports`...');
      await connection.execute(
        'ALTER TABLE `department_reports` ADD COLUMN `revision_notes` TEXT NULL AFTER `revision_number`'
      );
      console.log('✅ Added `revision_notes` column.');
      addedCount++;
    } else {
      console.log('ℹ️ Column `revision_notes` already exists (no-op).');
    }

    // 4. Guarded addition of is_latest
    if (!existingColumns.has('is_latest')) {
      console.log('Adding `is_latest` column to `department_reports`...');
      await connection.execute(
        'ALTER TABLE `department_reports` ADD COLUMN `is_latest` TINYINT(1) NOT NULL DEFAULT 1 AFTER `revision_number`'
      );
      console.log('✅ Added `is_latest` column.');
      addedCount++;
    } else {
      console.log('ℹ️ Column `is_latest` already exists (no-op).');
    }

    // 5. Output verified table structure
    const [finalTableInfo] = await connection.execute('DESCRIBE `department_reports`');
    console.log('\nVerified table structure:');
    console.table(finalTableInfo);

    console.log(`\nMigration completed successfully. (${addedCount} column(s) added, existing data untouched)`);
  } catch (err) {
    console.error('Migration execution failed:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
}

module.exports = migrate;
