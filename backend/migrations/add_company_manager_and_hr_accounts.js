const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to altrium_fresh_db on 127.0.0.1:3309.');

    // 1. Inspect existing columns in users table
    const [columns] = await sequelize.query('DESCRIBE users;');
    const columnNames = columns.map(c => c.Field);

    // 2. Modify `role` ENUM to include 'company_manager'
    console.log("Updating `role` ENUM definition to include 'company_manager'...");
    await sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('company_manager', 'hr_manager', 'department_manager', 'team_manager', 'employee') NOT NULL;"
    );

    // 3. Modify `quarter_batch` ENUM to include 'ALL' for year-round availability
    console.log("Updating `quarter_batch` ENUM definition to include 'ALL'...");
    await sequelize.query(
      "ALTER TABLE users MODIFY COLUMN quarter_batch ENUM('Q1', 'Q2', 'Q3', 'Q4', 'ALL') NULL DEFAULT NULL;"
    );

    // 4. Add `report_portfolio` column if missing
    if (!columnNames.includes('report_portfolio')) {
      console.log("Adding column `report_portfolio` VARCHAR(50) NULL DEFAULT NULL...");
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN report_portfolio VARCHAR(50) NULL DEFAULT NULL AFTER team;"
      );
    } else {
      console.log("Column `report_portfolio` already exists.");
    }

    // 5. Default demo password hash (10 rounds bcrypt)
    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    // 6. Find HR Manager (Amaya Senanayake)
    const [hrManagers] = await sequelize.query(
      "SELECT id, name, email FROM users WHERE role = 'hr_manager' LIMIT 1;"
    );
    if (hrManagers.length === 0) {
      throw new Error("HR Manager account not found in database.");
    }
    const amayaId = hrManagers[0].id;
    console.log(`Found HR Department Head: ${hrManagers[0].name} (ID: ${amayaId})`);

    // 7. Insert or verify Company Manager (Anura Senaratne)
    const [existingCM] = await sequelize.query(
      "SELECT id, name, email FROM users WHERE email = 'anura.company@altrium.com';"
    );
    let anuraId;
    if (existingCM.length === 0) {
      console.log("Creating Company Manager account: Anura Senaratne (anura.company@altrium.com)...");
      const [insertResult] = await sequelize.query(
        `INSERT INTO users (name, email, password, role, department, team, report_portfolio, quarter_batch, manager_id, createdAt, updatedAt)
         VALUES ('Anura Senaratne', 'anura.company@altrium.com', :password, 'company_manager', 'Management', 'Executive', NULL, NULL, NULL, NOW(), NOW());`,
        {
          replacements: { password: defaultPasswordHash }
        }
      );
      anuraId = insertResult;
      console.log(`Company Manager created with ID: ${anuraId}`);
    } else {
      anuraId = existingCM[0].id;
      console.log(`Company Manager account already exists with ID: ${anuraId}`);
    }

    // 8. Update Department Heads (Dinesh, Chamari, Amaya) to report to Anura Senaratne
    console.log("Updating Department Heads manager_id to Company Manager (Anura Senaratne)...");
    await sequelize.query(
      "UPDATE users SET manager_id = :anuraId, updatedAt = NOW() WHERE email IN ('dinesh.it@altrium.com', 'chamari.finance@altrium.com', 'amaya.hr@altrium.com');",
      {
        replacements: { anuraId }
      }
    );

    // 9. Insert or verify 3 HR Employees (Ayesha Perera, Ruwan Fernando, Nethmi Silva)
    const hrEmployees = [
      {
        name: 'Ayesha Perera',
        email: 'ayesha.hr@altrium.com',
        role: 'employee',
        department: 'HR',
        team: 'HR',
        report_portfolio: 'IT',
        quarter_batch: 'ALL',
        manager_id: amayaId
      },
      {
        name: 'Ruwan Fernando',
        email: 'ruwan.hr@altrium.com',
        role: 'employee',
        department: 'HR',
        team: 'HR',
        report_portfolio: 'Finance',
        quarter_batch: 'ALL',
        manager_id: amayaId
      },
      {
        name: 'Nethmi Silva',
        email: 'nethmi.hr@altrium.com',
        role: 'employee',
        department: 'HR',
        team: 'HR',
        report_portfolio: null,
        quarter_batch: 'ALL',
        manager_id: amayaId
      }
    ];

    for (const emp of hrEmployees) {
      const [existingEmp] = await sequelize.query(
        "SELECT id, name, email FROM users WHERE email = :email;",
        { replacements: { email: emp.email } }
      );

      if (existingEmp.length === 0) {
        console.log(`Creating HR Employee: ${emp.name} (${emp.email}) - Portfolio: ${emp.report_portfolio || 'None'}...`);
        await sequelize.query(
          `INSERT INTO users (name, email, password, role, department, team, report_portfolio, quarter_batch, manager_id, createdAt, updatedAt)
           VALUES (:name, :email, :password, :role, :department, :team, :report_portfolio, :quarter_batch, :manager_id, NOW(), NOW());`,
          {
            replacements: {
              name: emp.name,
              email: emp.email,
              password: defaultPasswordHash,
              role: emp.role,
              department: emp.department,
              team: emp.team,
              report_portfolio: emp.report_portfolio,
              quarter_batch: emp.quarter_batch,
              manager_id: emp.manager_id
            }
          }
        );
      } else {
        console.log(`HR Employee ${emp.name} (${emp.email}) already exists with ID: ${existingEmp[0].id}`);
        // Ensure manager_id, portfolio, and quarter_batch are up to date without altering password
        await sequelize.query(
          `UPDATE users SET manager_id = :manager_id, report_portfolio = :report_portfolio, quarter_batch = :quarter_batch, updatedAt = NOW()
           WHERE id = :id;`,
          {
            replacements: {
              manager_id: emp.manager_id,
              report_portfolio: emp.report_portfolio,
              quarter_batch: emp.quarter_batch,
              id: existingEmp[0].id
            }
          }
        );
      }
    }

    console.log('\n================================================================');
    console.log('  POST-MIGRATION VERIFICATION CHECKS                            ');
    console.log('================================================================');

    // Total counts
    const [totalUsers] = await sequelize.query("SELECT COUNT(*) as count FROM users;");
    const [roleCounts] = await sequelize.query("SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC;");
    console.log(`Total Users in Database: ${totalUsers[0].count} (Expected: 94)`);
    console.table(roleCounts);

    // Hierarchy check: Dept heads reporting to Company Manager
    const [deptHeadReports] = await sequelize.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.manager_id, m.name as manager_name, m.role as manager_role
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.email IN ('dinesh.it@altrium.com', 'chamari.finance@altrium.com', 'amaya.hr@altrium.com', 'anura.company@altrium.com');`
    );
    console.log('\nDepartment Heads & Company Manager Hierarchy:');
    console.table(deptHeadReports);

    // HR Employees check
    const [hrEmpReports] = await sequelize.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.team, u.report_portfolio, u.quarter_batch, u.manager_id, m.name as manager_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.department = 'HR' OR u.role = 'hr_manager'
       ORDER BY u.role, u.id;`
    );
    console.log('\nHR Department Members:');
    console.table(hrEmpReports);

    // Preserved Plan records check
    const [plans] = await sequelize.query(
      "SELECT id, title, type, recipient_id, status, due_date FROM plans WHERE id IN (7, 40);"
    );
    console.log('\nPreserved Plans 7 and 40:');
    console.table(plans);

    // Preserved Evidence records check
    const [evidences] = await sequelize.query(
      "SELECT id, plan_id, recipient_id, original_filename, file_size, idempotency_key FROM evidence WHERE id IN (12, 13);"
    );
    console.log('\nPreserved Evidence 12 and 13:');
    console.table(evidences);

    console.log('\n[SUCCESS] Migration add_company_manager_and_hr_accounts executed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Migration failed:', err);
    process.exit(1);
  }
}

migrate();
