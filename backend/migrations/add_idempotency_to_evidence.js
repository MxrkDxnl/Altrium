const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

const EVIDENCE_STORAGE_DIR = path.resolve(__dirname, '../storage/evidence');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to altrium_fresh_db on 127.0.0.1:3309.');

    // 1. Inspect existing columns in evidence table
    const [columns] = await sequelize.query('DESCRIBE evidence;');
    const columnNames = columns.map(c => c.Field);

    // 2. Add idempotency_key if not present
    if (!columnNames.includes('idempotency_key')) {
      console.log('Adding column `idempotency_key` VARCHAR(128) NULL...');
      await sequelize.query('ALTER TABLE evidence ADD COLUMN idempotency_key VARCHAR(128) NULL AFTER note;');
    } else {
      console.log('Column `idempotency_key` already exists.');
    }

    // 3. Add payload_hash if not present
    if (!columnNames.includes('payload_hash')) {
      console.log('Adding column `payload_hash` VARCHAR(64) NULL...');
      await sequelize.query('ALTER TABLE evidence ADD COLUMN payload_hash VARCHAR(64) NULL AFTER idempotency_key;');
    } else {
      console.log('Column `payload_hash` already exists.');
    }

    // 4. Check existing indexes on evidence table
    const [indexes] = await sequelize.query('SHOW INDEX FROM evidence;');
    const indexNames = indexes.map(i => i.Key_name);

    if (!indexNames.includes('uq_evidence_plan_recipient_idempotency')) {
      console.log('Adding composite UNIQUE constraint `uq_evidence_plan_recipient_idempotency` (plan_id, recipient_id, idempotency_key)...');
      await sequelize.query(
        'ALTER TABLE evidence ADD UNIQUE KEY uq_evidence_plan_recipient_idempotency (plan_id, recipient_id, idempotency_key);'
      );
    } else {
      console.log('Index `uq_evidence_plan_recipient_idempotency` already exists.');
    }

    // 5. Backfill existing records (Evidence 12 and 13) with stable legacy idempotency keys and payload hashes
    const [existingEvidences] = await sequelize.query('SELECT id, plan_id, recipient_id, file_path, note, idempotency_key, payload_hash FROM evidence;');
    for (const ev of existingEvidences) {
      if (!ev.idempotency_key || !ev.payload_hash) {
        const legacyKey = ev.idempotency_key || `legacy_manual_test_${ev.id}`;
        let computedPayloadHash = ev.payload_hash;

        if (!computedPayloadHash) {
          const diskPath = path.resolve(EVIDENCE_STORAGE_DIR, ev.file_path);
          let fileHash = 'legacy_file_hash';
          if (fs.existsSync(diskPath)) {
            const fileBuf = fs.readFileSync(diskPath);
            fileHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
          }
          computedPayloadHash = crypto.createHash('sha256').update(fileHash).update(ev.note || '').digest('hex');
        }

        console.log(`Backfilling legacy metadata for Evidence ${ev.id}: key=${legacyKey}, hash=${computedPayloadHash.slice(0, 16)}...`);
        await sequelize.query(
          'UPDATE evidence SET idempotency_key = :legacyKey, payload_hash = :payloadHash WHERE id = :id;',
          {
            replacements: {
              legacyKey,
              payloadHash: computedPayloadHash,
              id: ev.id
            }
          }
        );
      }
    }

    console.log('\n[SUCCESS] Migration add_idempotency_to_evidence completed successfully.');

    const [updatedDescribe] = await sequelize.query('DESCRIBE evidence;');
    console.table(updatedDescribe);

    const [updatedIndexes] = await sequelize.query('SHOW INDEX FROM evidence;');
    console.table(updatedIndexes.map(i => ({ Table: i.Table, Key_name: i.Key_name, Column_name: i.Column_name, Non_unique: i.Non_unique })));

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
