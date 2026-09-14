const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to altrium_fresh_db on 127.0.0.1:3309.');

    console.log('Executing migration: ALTER TABLE evidence DROP INDEX plan_id...');
    // Drop unique constraint on plan_id to allow multiple evidence uploads per plan
    await sequelize.query('ALTER TABLE evidence DROP INDEX plan_id;');
    console.log('Unique constraint dropped successfully.');

    const [indexes] = await sequelize.query('SHOW INDEX FROM evidence;');
    console.log('\n--- CURRENT INDEXES ON evidence ---');
    console.table(indexes);

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
