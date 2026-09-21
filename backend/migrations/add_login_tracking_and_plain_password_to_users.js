const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

/**
 * Idempotent, safe schema migration to add login tracking and plain password columns.
 * 
 * - Idempotent: Checks whether columns exist before running ALTER TABLE.
 * - Non-destructive: Creates pre-migration backup table 'users_backup_pre_migration'.
 * - Preserves all existing data: Never deletes, truncates, or resets rows.
 * - Leaves existing plain_password as NULL (does not fabricate or overwrite passwords).
 */
async function migrate(options = {}) {
  console.log('================================================================');
  console.log('MIGRATION: Add Login Tracking & Plain Password to Users (Idempotent)');
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    console.log(`✅ Connected to database: ${sequelize.config.database}`);

    // 1. Verify `users` table exists
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      throw new Error("Table 'users' does not exist in the connected database.");
    }

    // 2. Count existing users before modification
    const [countBeforeRes] = await sequelize.query('SELECT COUNT(*) AS totalUsers FROM `users`');
    const userCountBefore = Number(countBeforeRes[0]?.totalUsers || 0);
    console.log(`Existing user count before migration: ${userCountBefore}`);

    // 3. Pre-migration backup of the `users` table
    const [backupCheck] = await sequelize.query("SHOW TABLES LIKE 'users_backup_pre_migration'");
    if (backupCheck.length === 0) {
      console.log('Creating pre-migration backup table `users_backup_pre_migration`...');
      await sequelize.query('CREATE TABLE `users_backup_pre_migration` AS SELECT * FROM `users`');
      console.log('✅ Created backup table `users_backup_pre_migration`.');
    } else {
      console.log('ℹ️ Backup table `users_backup_pre_migration` already exists.');
    }

    const [backupCountRes] = await sequelize.query('SELECT COUNT(*) AS totalBackup FROM `users_backup_pre_migration`');
    const backupRowCount = Number(backupCountRes[0]?.totalBackup || 0);
    console.log(`Backup table records: ${backupRowCount}`);

    // 4. Inspect current columns in `users`
    const [existingColumnsList] = await sequelize.query('SHOW COLUMNS FROM `users`');
    const existingColumns = new Set(existingColumnsList.map(c => c.Field));
    console.log('Existing columns in `users`:', Array.from(existingColumns));

    const addedColumns = [];

    // 5. Add plain_password column (NULL by default, no backfill)
    if (!existingColumns.has('plain_password')) {
      console.log('Adding `plain_password` column to `users`...');
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `plain_password` VARCHAR(255) NULL DEFAULT NULL AFTER `password`'
      );
      console.log('✅ Added `plain_password` column (VARCHAR(255) NULL DEFAULT NULL).');
      addedColumns.push('plain_password');
    } else {
      console.log('ℹ️ Column `plain_password` already exists (no-op).');
    }

    // 6. Add login_count column
    if (!existingColumns.has('login_count')) {
      console.log('Adding `login_count` column to `users`...');
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `login_count` INT NOT NULL DEFAULT 0 AFTER `is_active`'
      );
      console.log('✅ Added `login_count` column (INT NOT NULL DEFAULT 0).');
      addedColumns.push('login_count');
    } else {
      console.log('ℹ️ Column `login_count` already exists (no-op).');
    }

    // 7. Add last_login_at column
    if (!existingColumns.has('last_login_at')) {
      console.log('Adding `last_login_at` column to `users`...');
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `last_login_at` DATETIME NULL DEFAULT NULL AFTER `login_count`'
      );
      console.log('✅ Added `last_login_at` column (DATETIME NULL DEFAULT NULL).');
      addedColumns.push('last_login_at');
    } else {
      console.log('ℹ️ Column `last_login_at` already exists (no-op).');
    }

    // 8. Verify user count remained unchanged after migration
    const [countAfterRes] = await sequelize.query('SELECT COUNT(*) AS totalUsers FROM `users`');
    const userCountAfter = Number(countAfterRes[0]?.totalUsers || 0);
    console.log(`User count after migration: ${userCountAfter}`);

    if (userCountBefore !== userCountAfter) {
      throw new Error(`CRITICAL: User count mismatch! Before: ${userCountBefore}, After: ${userCountAfter}`);
    }

    // 9. Inspect final table structure
    const [finalColumns] = await sequelize.query('SHOW COLUMNS FROM `users`');
    console.log('\nVerified final columns in `users`:');
    console.table(finalColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Default: c.Default })));

    console.log(`\nMigration completed successfully. Added: [${addedColumns.join(', ')}]. Total users: ${userCountAfter}`);

    return {
      success: true,
      database: sequelize.config.database,
      userCountBefore,
      userCountAfter,
      backupTable: 'users_backup_pre_migration',
      backupRowCount,
      addedColumns,
      columns: finalColumns
    };
  } catch (err) {
    console.error('Migration execution failed:', err);
    throw err;
  } finally {
    if (options.closeConnection || require.main === module) {
      await sequelize.close();
    }
  }
}

if (require.main === module) {
  migrate({ closeConnection: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrate;
