const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

async function migrate() {
  console.log('================================================================');
  console.log('MIGRATION: Add Login Tracking & Plain Password to Users (Guarded)');
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    // 1. Inspect existing columns
    const [columns] = await sequelize.query('DESCRIBE `users`');
    const existingColumns = new Set(columns.map(c => c.Field));
    console.log('Existing columns in `users`:', Array.from(existingColumns));

    let addedCount = 0;

    // 2. Add plain_password column
    if (!existingColumns.has('plain_password')) {
      console.log('Adding `plain_password` column to `users`...');
      await sequelize.query(
        "ALTER TABLE `users` ADD COLUMN `plain_password` VARCHAR(255) NULL DEFAULT '12345678' AFTER `password`"
      );
      console.log('✅ Added `plain_password` column.');
      addedCount++;
    } else {
      console.log('ℹ️ Column `plain_password` already exists (no-op).');
    }

    // 3. Add login_count column
    if (!existingColumns.has('login_count')) {
      console.log('Adding `login_count` column to `users`...');
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `login_count` INT NOT NULL DEFAULT 0 AFTER `is_active`'
      );
      console.log('✅ Added `login_count` column.');
      addedCount++;
    } else {
      console.log('ℹ️ Column `login_count` already exists (no-op).');
    }

    // 4. Add last_login_at column
    if (!existingColumns.has('last_login_at')) {
      console.log('Adding `last_login_at` column to `users`...');
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `last_login_at` DATETIME NULL DEFAULT NULL AFTER `login_count`'
      );
      console.log('✅ Added `last_login_at` column.');
      addedCount++;
    } else {
      console.log('ℹ️ Column `last_login_at` already exists (no-op).');
    }

    // 5. Backfill null plain_password with default '12345678'
    console.log("Backfilling any NULL `plain_password` with default '12345678'...");
    await sequelize.query(
      "UPDATE `users` SET `plain_password` = '12345678' WHERE `plain_password` IS NULL"
    );
    console.log('✅ Backfill complete.');

    // 6. Verify table structure
    const [finalTableInfo] = await sequelize.query('DESCRIBE `users`');
    console.log('\nVerified table structure:');
    console.table(finalTableInfo);

    console.log(`\nMigration completed successfully. (${addedCount} column(s) added).`);
  } catch (err) {
    console.error('Migration execution failed:', err);
    throw err;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrate;
