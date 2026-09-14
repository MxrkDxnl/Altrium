const sequelize = require('../config/database');

async function migrate() {
  console.log('--- Running Guarded Migration: add_task_group_and_draft_columns ---');
  try {
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks'
    `);
    const existingCols = columns.map(c => c.COLUMN_NAME.toLowerCase());

    // 1. Add group_subject_ids column if missing
    if (!existingCols.includes('group_subject_ids')) {
      console.log('Adding column "group_subject_ids" (JSON NULL) to tasks...');
      await sequelize.query(`
        ALTER TABLE tasks 
        ADD COLUMN group_subject_ids JSON NULL AFTER plan_id
      `);
      console.log('✅ Added "group_subject_ids" column.');
    } else {
      console.log('Column "group_subject_ids" already exists in tasks.');
    }

    // 2. Add draft_content column if missing
    if (!existingCols.includes('draft_content')) {
      console.log('Adding column "draft_content" (JSON NULL) to tasks...');
      await sequelize.query(`
        ALTER TABLE tasks 
        ADD COLUMN draft_content JSON NULL AFTER group_subject_ids
      `);
      console.log('✅ Added "draft_content" column.');
    } else {
      console.log('Column "draft_content" already exists in tasks.');
    }

    // 3. Update type enum to include 'downward_review'
    console.log('Updating "type" ENUM on tasks to include downward_review...');
    await sequelize.query(`
      ALTER TABLE tasks 
      MODIFY COLUMN type ENUM('self_review', 'peer_review', 'upward_review', 'downward_review', 'pip', 'pdp') NOT NULL
    `);
    console.log('✅ Updated "type" ENUM.');

    // 4. Update feedback_type enum to include 'downward'
    console.log('Updating "feedback_type" ENUM on tasks to include downward...');
    await sequelize.query(`
      ALTER TABLE tasks 
      MODIFY COLUMN feedback_type ENUM('self', 'peer', 'upward', 'downward') NULL
    `);
    console.log('✅ Updated "feedback_type" ENUM.');

    console.log('--- Migration completed successfully ---');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
