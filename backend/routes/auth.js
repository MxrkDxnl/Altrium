const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const payload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department,
      team: user.team,
      report_portfolio: user.report_portfolio,
      quarter_batch: user.quarter_batch,
      profile_picture: user.profile_picture
    };

    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET is not configured in environment.');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
