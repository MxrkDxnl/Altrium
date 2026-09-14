const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => {
      const lines = s.split(/\r?\n/).filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*'));
      return lines.join('\n').trim();
    })
    .filter(s => s.length > 0);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('================================================================');
  console.log('  AIVEN CLOUD MYSQL DATABASE IMPORTER                           ');
  console.log('================================================================\n');

  const host = process.env.AIVEN_HOST || await prompt('Enter Aiven Host (e.g. aiven-altrium-performance-tracker.d.aivencloud.com): ');
  const port = parseInt(process.env.AIVEN_PORT || await prompt('Enter Aiven Port (e.g. 13997): ') || '13997', 10);
  const user = process.env.AIVEN_USER || await prompt('Enter Aiven User [avnadmin]: ') || 'avnadmin';
  const database = process.env.AIVEN_DB || await prompt('Enter Aiven Database [defaultdb]: ') || 'defaultdb';
  const password = process.env.AIVEN_PASSWORD || await prompt('Enter Aiven Password: ');

  if (!host || !password) {
    console.error('Error: Host and Password are required.');
    process.exit(1);
  }

  console.log(`\nConnecting to Aiven MySQL at ${host}:${port}/${database} as ${user} via SSL...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false
      },
      multipleStatements: true
    });
    console.log('[SUCCESS] Connected to Aiven MySQL instance!\n');
  } catch (err) {
    console.error('[FAILED] Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Import Schema DDL
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    console.log('1. Importing database/schema.sql (DDL)...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const schemaStatements = splitSqlStatements(schemaSql);
    for (const stmt of schemaStatements) {
      await connection.query(stmt);
    }
    console.log(`   [PASS] Applied ${schemaStatements.length} statements from schema.sql\n`);

    // 2. Import Demo Seed Data
    const seedPath = path.resolve(__dirname, '..', 'database', 'seed_demo.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }
    console.log('2. Importing database/seed_demo.sql (Seed Data)...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const seedStatements = splitSqlStatements(seedSql);
    for (const stmt of seedStatements) {
      await connection.query(stmt);
    }
    console.log(`   [PASS] Applied ${seedStatements.length} statements from seed_demo.sql\n`);

    // 3. Verify Table Counts
    const [tables] = await connection.query('SHOW TABLES');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [plans] = await connection.query('SELECT COUNT(*) as count FROM plans');

    console.log('================================================================');
    console.log('  AIVEN DATABASE IMPORT COMPLETE & VERIFIED                     ');
    console.log('================================================================');
    console.log(`- Tables Created: ${tables.length}`);
    console.log(`- Users Seeded:   ${users[0].count}`);
    console.log(`- Plans Seeded:   ${plans[0].count}`);
    console.log('\nYour Aiven cloud database is fully prepared for Railway & Vercel deployment!');

  } catch (err) {
    console.error('Import error:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
