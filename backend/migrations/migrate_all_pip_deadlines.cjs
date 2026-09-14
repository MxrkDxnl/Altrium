const path = require('path');
const backendDir = path.resolve(__dirname, '..');
require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });
const sequelize = require('../config/database');
const Plan = require('../models/Plan');

async function migratePipDeadlines() {
  console.log('================================================================');
  console.log('  MIGRATION: UNIVERSAL PIP DEADLINE UPDATE TO 2027-08-30');
  console.log('================================================================\n');

  const TARGET_DEADLINE = '2027-08-30';
  let affectedIds = [];
  let beforeState = [];
  let updatedCount = 0;

  await sequelize.transaction(async (t) => {
    // 1. Find all PIP plans
    const pipPlans = await Plan.findAll({
      where: { type: 'PIP' },
      order: [['id', 'ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    console.log(`Found ${pipPlans.length} existing PIP plan(s) to evaluate.`);

    for (const plan of pipPlans) {
      affectedIds.push(plan.id);
      beforeState.push({
        id: plan.id,
        title: plan.title,
        status: plan.status,
        old_due_date: plan.due_date,
        new_due_date: TARGET_DEADLINE,
        recipient_id: plan.recipient_id,
        manager_id: plan.manager_id,
        createdAt: plan.createdAt
      });

      console.log(`- Plan ${plan.id} ("${plan.title}"): current due_date="${plan.due_date}" -> updating to "${TARGET_DEADLINE}"`);
      
      // Apply update
      plan.due_date = TARGET_DEADLINE;
      await plan.save({ transaction: t });
      updatedCount++;
    }

    // 2. Verify PDP plans remain completely untouched
    const pdpPlans = await Plan.findAll({
      where: { type: 'PDP' },
      transaction: t
    });
    console.log(`\nVerified ${pdpPlans.length} PDP plan(s) remain untouched:`);
    for (const pdp of pdpPlans) {
      console.log(`  * PDP Plan ${pdp.id} ("${pdp.title}"): status="${pdp.status}", due_date="${pdp.due_date}"`);
    }
  });

  console.log('\n--- Post-Migration State Verification ---');
  const postPlans = await Plan.findAll({ order: [['id', 'ASC']] });
  for (const p of postPlans) {
    console.log(`Plan ${p.id} [${p.type}]: status="${p.status}", due_date="${p.due_date}", title="${p.title}"`);
  }

  console.log('\n================================================================');
  console.log('  MIGRATION SUMMARY');
  console.log('================================================================');
  console.log(`  Total PIP Plans Processed: ${updatedCount}`);
  console.log(`  Affected Plan IDs: [${affectedIds.join(', ')}]`);
  console.log(`  Target Due Date Applied: "${TARGET_DEADLINE}"`);
  console.log('  Before / After details:');
  console.log(JSON.stringify(beforeState, null, 2));
  console.log('================================================================\n');

  return {
    updatedCount,
    affectedIds,
    beforeState
  };
}

if (require.main === module) {
  migratePipDeadlines()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migratePipDeadlines;
