const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

async function migrate() {
  console.log('================================================================');
  console.log('MIGRATION: Create department_reports Table (Guarded)');
  console.log('================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3309,
    user: process.env.DB_USER || 'altrium_app_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'altrium_fresh_db'
  });

  try {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`department_reports\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`department\` VARCHAR(50) NOT NULL,
        \`quarter\` ENUM('Q1', 'Q2', 'Q3', 'Q4') NOT NULL,
        \`year\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`reviews_summary\` TEXT NOT NULL,
        \`pip_summary\` TEXT NOT NULL,
        \`pdp_summary\` TEXT NOT NULL,
        \`author_id\` INT NOT NULL,
        \`recipient_id\` INT NOT NULL,
        \`file_path\` VARCHAR(255) NOT NULL,
        \`original_filename\` VARCHAR(255) NOT NULL,
        \`file_size\` INT NOT NULL,
        \`mime_type\` VARCHAR(100) NOT NULL,
        \`revision_number\` INT NOT NULL DEFAULT 1,
        \`revision_notes\` TEXT DEFAULT NULL,
        \`is_latest\` TINYINT(1) NOT NULL DEFAULT 1,
        \`parent_report_id\` INT DEFAULT NULL,
        \`submission_key\` VARCHAR(128) NOT NULL,
        \`payload_hash\` VARCHAR(64) NOT NULL,
        \`submitted_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_department_reports_author_id\` (\`author_id\`),
        KEY \`idx_department_reports_recipient_id\` (\`recipient_id\`),
        KEY \`idx_department_reports_parent_id\` (\`parent_report_id\`),
        KEY \`idx_department_reports_dept_cycle\` (\`department\`, \`quarter\`, \`year\`),
        KEY \`idx_department_reports_submission_key\` (\`submission_key\`),
        CONSTRAINT \`fk_dept_reports_author\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_dept_reports_recipient\` FOREIGN KEY (\`recipient_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`fk_dept_reports_parent\` FOREIGN KEY (\`parent_report_id\`) REFERENCES \`department_reports\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log('Executing guarded CREATE TABLE statement...');
    await connection.execute(createTableSql);
    console.log('✅ Table `department_reports` created / confirmed.');

    const [tableInfo] = await connection.execute('DESCRIBE `department_reports`');
    console.log('\nTable structure:');
    console.table(tableInfo);

    console.log('\nMigration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch(e => {
    console.error('Migration execution failed:', e);
    process.exit(1);
  });
}

module.exports = migrate;
