const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to altrium_fresh_db on 127.0.0.1:3309.');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS evidence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id INT NOT NULL UNIQUE,
        recipient_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        note TEXT NULL,
        submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_evidence_plan FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE,
        CONSTRAINT fk_evidence_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_evidence_recipient (recipient_id),
        INDEX idx_evidence_plan (plan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log('Executing migration: CREATE TABLE IF NOT EXISTS evidence...');
    await sequelize.query(createTableSQL);
    console.log('Migration executed successfully.');

    const [describeResult] = await sequelize.query('DESCRIBE evidence;');
    console.log('\n--- DESCRIBE evidence ---');
    console.table(describeResult);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
