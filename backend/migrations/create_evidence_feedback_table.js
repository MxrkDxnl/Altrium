const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

async function migrate() {
  console.log('================================================================');
  console.log('MIGRATION: Create evidence_feedback Table (Guarded)');
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
      CREATE TABLE IF NOT EXISTS \`evidence_feedback\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`evidence_id\` INT NOT NULL,
        \`plan_id\` INT NOT NULL,
        \`manager_id\` INT NOT NULL,
        \`feedback_text\` TEXT NOT NULL,
        \`idempotency_key\` VARCHAR(128) DEFAULT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_evidence_feedback_evidence_id\` (\`evidence_id\`),
        KEY \`idx_evidence_feedback_plan_id\` (\`plan_id\`),
        KEY \`idx_evidence_feedback_manager_id\` (\`manager_id\`),
        CONSTRAINT \`fk_evidence_feedback_evidence\` FOREIGN KEY (\`evidence_id\`) REFERENCES \`evidence\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_evidence_feedback_plan\` FOREIGN KEY (\`plan_id\`) REFERENCES \`Plans\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_evidence_feedback_manager\` FOREIGN KEY (\`manager_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        UNIQUE KEY \`uq_evidence_feedback_idempotency\` (\`evidence_id\`, \`manager_id\`, \`idempotency_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log('Executing guarded CREATE TABLE statement...');
    await connection.execute(createTableSql);
    console.log('✅ Table `evidence_feedback` created / confirmed.');

    const [tableInfo] = await connection.execute('DESCRIBE `evidence_feedback`');
    console.log('\nTable structure:');
    console.table(tableInfo);

    const [indexInfo] = await connection.execute('SHOW INDEX FROM `evidence_feedback`');
    console.log('\nIndexes:');
    console.table(indexInfo.map(i => ({ Key_name: i.Key_name, Column_name: i.Column_name, Non_unique: i.Non_unique })));

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
