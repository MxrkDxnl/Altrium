const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

// Import models to ensure they are synchronized
const User = require('./models/User');
const Task = require('./models/Task');
const Review = require('./models/Review');
const Notification = require('./models/Notification');
const Plan = require('./models/Plan');
const Evidence = require('./models/Evidence');
const DepartmentReport = require('./models/DepartmentReport');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/history', require('./routes/history'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Verification route to inspect live database schema and confirm migration
app.get('/api/health/db-schema', async (req, res) => {
  try {
    const [columns] = await sequelize.query('SHOW COLUMNS FROM `users`');
    const [userCountResult] = await sequelize.query('SELECT COUNT(*) AS totalUsers FROM `users`');
    const [backupCheck] = await sequelize.query("SHOW TABLES LIKE 'users_backup_pre_migration'");
    let backupTotalUsers = null;
    if (backupCheck.length > 0) {
      const [bCountRes] = await sequelize.query('SELECT COUNT(*) AS totalBackupUsers FROM `users_backup_pre_migration`');
      backupTotalUsers = bCountRes[0]?.totalBackupUsers;
    }

    const columnFields = columns.map(c => c.Field);
    const requiredColumns = ['plain_password', 'login_count', 'last_login_at'];
    const missingColumns = requiredColumns.filter(c => !columnFields.includes(c));

    const [admins] = await sequelize.query("SELECT id, name, email, role, is_active, login_count, last_login_at FROM users WHERE role = 'admin'");

    res.json({
      status: 'ok',
      database: sequelize.config.database,
      totalUsers: userCountResult[0]?.totalUsers,
      backupTableExists: backupCheck.length > 0,
      backupTotalUsers,
      admins,
      columns,
      missingColumns,
      isSchemaReady: missingColumns.length === 0
    });
  } catch (err) {
    console.error('Schema check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Explicit migration trigger route (idempotent)
app.post('/api/health/run-migration', async (req, res) => {
  try {
    const runMigration = require('./migrations/add_login_tracking_and_plain_password_to_users');
    const result = await runMigration({ closeConnection: false });
    res.json(result);
  } catch (err) {
    console.error('Migration execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

// Authenticate DB connection, execute idempotent migration, and start server
sequelize.authenticate()
  .then(async () => {
    console.log(`Database connected successfully (${sequelize.config.database})`);

    try {
      const runMigration = require('./migrations/add_login_tracking_and_plain_password_to_users');
      const migrationResult = await runMigration({ closeConnection: false });
      console.log(`[Startup Migration] Success: added ${migrationResult.addedColumns.length} columns, total users: ${migrationResult.userCountAfter}`);
    } catch (migErr) {
      console.error('[Startup Migration] Warning/Error executing migration on boot:', migErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
  });
