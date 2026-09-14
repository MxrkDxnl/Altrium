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

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

const PORT = process.env.PORT || 5000;

// Authenticate DB connection without schema modification and start server
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully (no schema alterations)');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
  });
