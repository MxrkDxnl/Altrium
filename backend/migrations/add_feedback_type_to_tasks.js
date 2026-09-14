const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to altrium_fresh_db on 127.0.0.1:3309.');

    // 1. Inspect existing columns in tasks table
    const [columns] = await sequelize.query('DESCRIBE tasks;');
    const columnNames = columns.map(c => c.Field);

    // 2. Extend `type` ENUM to include 'upward_review'
    console.log("Updating `tasks.type` ENUM definition to include 'upward_review'...");
    await sequelize.query(
      "ALTER TABLE tasks MODIFY COLUMN type ENUM('self_review', 'peer_review', 'upward_review', 'pip', 'pdp') NOT NULL;"
    );

    // 3. Add `feedback_type` column if missing
    if (!columnNames.includes('feedback_type')) {
      console.log("Adding column `feedback_type` ENUM('self', 'peer', 'upward') NULL DEFAULT NULL...");
      await sequelize.query(
        "ALTER TABLE tasks ADD COLUMN feedback_type ENUM('self', 'peer', 'upward') NULL DEFAULT NULL AFTER type;"
      );
    } else {
      console.log("Column `feedback_type` already exists in tasks.");
    }

    // 4. Backfill existing task records
    console.log("Backfilling existing tasks with feedback_type...");
    await sequelize.query(
      "UPDATE tasks SET feedback_type = 'self' WHERE type = 'self_review' AND feedback_type IS NULL;"
    );
    await sequelize.query(
      "UPDATE tasks SET feedback_type = 'peer' WHERE type = 'peer_review' AND feedback_type IS NULL;"
    );
    await sequelize.query(
      "UPDATE tasks SET feedback_type = 'upward' WHERE type = 'upward_review' AND feedback_type IS NULL;"
    );

    console.log('\n================================================================');
    console.log('  POST-MIGRATION VERIFICATION CHECKS                            ');
    console.log('================================================================');

    const [updatedColumns] = await sequelize.query('DESCRIBE tasks;');
    console.table(updatedColumns);

    const [taskCounts] = await sequelize.query(
      'SELECT type, feedback_type, COUNT(*) as count FROM tasks GROUP BY type, feedback_type;'
    );
    console.table(taskCounts);

    console.log('\n[SUCCESS] Migration add_feedback_type_to_tasks executed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Migration failed:', err);
    process.exit(1);
  }
}

migrate();
