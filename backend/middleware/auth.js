const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not defined.');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch', 'is_active']
    });

    if (!user || user.is_active === false) {
      return res.status(401).json({ message: 'User account is inactive or not found' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department,
      team: user.team,
      report_portfolio: user.report_portfolio,
      quarter_batch: user.quarter_batch,
      is_active: user.is_active
    };
    next();
  } catch (_err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;

