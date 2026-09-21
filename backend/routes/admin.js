const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Middleware to enforce Admin role strictly
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied: Administrator privileges required'
    });
  }
  next();
};

// Apply auth and admin check to all routes
router.use(auth, requireAdmin);

// =============================================================================
// 1. GET /api/admin/members - Search, filter, and list members
// =============================================================================
router.get('/members', async (req, res) => {
  try {
    const { search, department, team, role, status, quarter_batch } = req.query;

    const where = {};

    if (department && department !== 'all') {
      where.department = department;
    }

    if (team && team !== 'all') {
      where.team = team;
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (quarter_batch && quarter_batch !== 'all') {
      where.quarter_batch = quarter_batch;
    }

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } }
      ];
    }

    const members = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'email', 'role', 'department', 'team',
        'report_portfolio', 'quarter_batch', 'manager_id', 'is_active',
        'profile_picture', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        }
      ],
      order: [['id', 'ASC']]
    });

    // Compute summary stats for dashboard/management cards
    const [totalCount, activeCount, inactiveCount] = await Promise.all([
      User.count(),
      User.count({ where: { is_active: true } }),
      User.count({ where: { is_active: false } })
    ]);

    res.json({
      members,
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount
      }
    });
  } catch (err) {
    console.error('Admin GET /members error:', err);
    res.status(500).json({ message: 'Failed to fetch members list' });
  }
});

// =============================================================================
// 1b. GET /api/admin/passwords - Employee Credentials & Login Activity Tracker
// =============================================================================
router.get('/passwords', async (req, res) => {
  try {
    const { search, department, team, role, status, login_status, sort_by } = req.query;

    const where = {};

    if (department && department !== 'all') {
      where.department = department;
    }

    if (team && team !== 'all') {
      where.team = team;
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    // Login Activity filter
    if (login_status === 'active') {
      where.login_count = { [Op.gt]: 0 };
    } else if (login_status === 'never') {
      where.login_count = 0;
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } }
      ];
    }

    let order = [['id', 'ASC']];
    if (sort_by === 'login_count_desc') {
      order = [['login_count', 'DESC'], ['name', 'ASC']];
    } else if (sort_by === 'login_count_asc') {
      order = [['login_count', 'ASC'], ['name', 'ASC']];
    } else if (sort_by === 'last_login_desc') {
      order = [['last_login_at', 'DESC NULLS LAST'], ['name', 'ASC']];
    } else if (sort_by === 'name_asc') {
      order = [['name', 'ASC']];
    } else if (sort_by === 'name_desc') {
      order = [['name', 'DESC']];
    }

    const members = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'email', 'role', 'department', 'team',
        'report_portfolio', 'quarter_batch', 'manager_id', 'is_active',
        'login_count', 'last_login_at', 'plain_password',
        'profile_picture', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        }
      ],
      order
    });

    // Compute KPI analytics
    const [totalCount, activeLoginsCount, neverLoggedInCount, totalLoginsResult] = await Promise.all([
      User.count(),
      User.count({ where: { login_count: { [Op.gt]: 0 } } }),
      User.count({ where: { login_count: 0 } }),
      User.sum('login_count')
    ]);

    res.json({
      members,
      stats: {
        total: totalCount,
        activeLogins: activeLoginsCount,
        neverLoggedIn: neverLoggedInCount,
        totalSessions: totalLoginsResult || 0
      }
    });
  } catch (err) {
    console.error('Admin GET /passwords error:', err);
    res.status(500).json({ message: 'Failed to fetch employee credentials and login activity' });
  }
});

// =============================================================================
// 2. GET /api/admin/reporting-managers - Get eligible active managers
// =============================================================================
router.get('/reporting-managers', async (req, res) => {
  try {
    const managers = await User.findAll({
      where: {
        is_active: true,
        role: {
          [Op.in]: ['operational_manager', 'department_manager', 'hr_manager', 'team_manager', 'admin']
        }
      },
      attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
      order: [['name', 'ASC']]
    });

    res.json(managers);
  } catch (err) {
    console.error('Admin GET /reporting-managers error:', err);
    res.status(500).json({ message: 'Failed to fetch reporting managers' });
  }
});

// =============================================================================
// 3. POST /api/admin/members - Create a new member
// =============================================================================
router.post('/members', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      team,
      report_portfolio,
      quarter_batch,
      manager_id
    } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }

    // 2. Validate temporary password length (min 12 characters)
    if (!password || password.length < 12) {
      return res.status(400).json({
        message: 'Temporary password must be at least 12 characters long'
      });
    }

    // 3. Validate role
    const validRoles = ['admin', 'operational_manager', 'hr_manager', 'department_manager', 'team_manager', 'employee'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // 4. Validate email uniqueness
    const existingUser = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    // 5. Validate reporting manager if specified
    let validatedManagerId = null;
    if (manager_id) {
      const managerUser = await User.findByPk(manager_id);
      if (!managerUser || !managerUser.is_active) {
        return res.status(400).json({
          message: 'Selected reporting manager is not found or is currently inactive'
        });
      }
      validatedManagerId = managerUser.id;
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Create member
    const newMember = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      plain_password: password,
      role,
      department: department?.trim() || null,
      team: team?.trim() || null,
      report_portfolio: report_portfolio?.trim() || null,
      quarter_batch: quarter_batch || null,
      manager_id: validatedManagerId,
      is_active: true,
      login_count: 0
    });

    const result = await User.findByPk(newMember.id, {
      attributes: [
        'id', 'name', 'email', 'role', 'department', 'team',
        'report_portfolio', 'quarter_batch', 'manager_id', 'is_active',
        'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        }
      ]
    });

    res.status(201).json({
      message: 'Member created successfully',
      member: result
    });
  } catch (err) {
    console.error('Admin POST /members error:', err);
    res.status(500).json({ message: 'Failed to create new member' });
  }
});

// =============================================================================
// 4. PATCH /api/admin/members/:id - Edit member details & reassignments
// =============================================================================
router.patch('/members/:id', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    const targetUser = await User.findByPk(memberId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const {
      name,
      email,
      password,
      role,
      department,
      team,
      report_portfolio,
      quarter_batch,
      manager_id
    } = req.body;

    // 1. Email uniqueness check
    if (email && email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'A valid email address is required' });
      }

      const duplicate = await User.findOne({
        where: {
          email: email.trim().toLowerCase(),
          id: { [Op.ne]: memberId }
        }
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Email address is already taken by another member' });
      }
      targetUser.email = email.trim().toLowerCase();
    }

    // 2. Name
    if (name && name.trim()) {
      targetUser.name = name.trim();
    }

    // 3. Optional password reset (min 8 chars)
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          message: 'Reset password must be at least 8 characters long'
        });
      }
      targetUser.password = await bcrypt.hash(password, 10);
      targetUser.plain_password = password;
    }

    // 4. Manager Active Direct Reports Reassignment Guard
    const directReportsCount = await User.count({
      where: { manager_id: targetUser.id, is_active: true }
    });

    const roleChanged = role && role !== targetUser.role;
    const deptChanged = department !== undefined && department !== targetUser.department;
    const teamChanged = team !== undefined && team !== targetUser.team;

    if (directReportsCount > 0 && (roleChanged || deptChanged || teamChanged)) {
      return res.status(400).json({
        message: `Cannot modify role, department, or team for a manager with ${directReportsCount} active direct report(s). Please reassign their subordinates to another manager first.`
      });
    }

    // 5. Update Role
    if (role) {
      const validRoles = ['admin', 'operational_manager', 'hr_manager', 'department_manager', 'team_manager', 'employee'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role: ${role}` });
      }
      targetUser.role = role;
    }

    // 6. Update Department & Team
    if (department !== undefined) targetUser.department = department?.trim() || null;
    if (team !== undefined) targetUser.team = team?.trim() || null;
    if (report_portfolio !== undefined) targetUser.report_portfolio = report_portfolio?.trim() || null;
    if (quarter_batch !== undefined) targetUser.quarter_batch = quarter_batch || null;

    // 7. Update Reporting Manager
    if (manager_id !== undefined) {
      if (manager_id === null || manager_id === '') {
        targetUser.manager_id = null;
      } else {
        const mgrId = parseInt(manager_id, 10);
        if (mgrId === memberId) {
          return res.status(400).json({ message: 'A member cannot be their own reporting manager' });
        }
        const managerUser = await User.findByPk(mgrId);
        if (!managerUser || !managerUser.is_active) {
          return res.status(400).json({ message: 'Selected reporting manager is inactive or does not exist' });
        }
        targetUser.manager_id = managerUser.id;
      }
    }

    await targetUser.save();

    const updated = await User.findByPk(memberId, {
      attributes: [
        'id', 'name', 'email', 'role', 'department', 'team',
        'report_portfolio', 'quarter_batch', 'manager_id', 'is_active',
        'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        }
      ]
    });

    res.json({
      message: 'Member updated successfully',
      member: updated
    });
  } catch (err) {
    console.error('Admin PATCH /members/:id error:', err);
    res.status(500).json({ message: 'Failed to update member' });
  }
});

// =============================================================================
// 5. PATCH /api/admin/members/:id/status - Soft Deactivate / Restore
// =============================================================================
router.patch('/members/:id/status', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    const targetUser = await User.findByPk(memberId);

    if (!targetUser) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Disallow self-deactivation
    if (req.user.id === memberId) {
      return res.status(400).json({ message: 'You cannot deactivate your own administrative account' });
    }

    const nextStatus = req.body.is_active !== undefined ? Boolean(req.body.is_active) : !targetUser.is_active;

    // If deactivating, guard against active direct reports
    if (!nextStatus) {
      const directReportsCount = await User.count({
        where: { manager_id: targetUser.id, is_active: true }
      });

      if (directReportsCount > 0) {
        return res.status(400).json({
          message: `Cannot deactivate a manager with ${directReportsCount} active direct report(s). Please reassign their subordinates to another manager first.`
        });
      }
    }

    targetUser.is_active = nextStatus;
    await targetUser.save();

    const updated = await User.findByPk(memberId, {
      attributes: [
        'id', 'name', 'email', 'role', 'department', 'team',
        'report_portfolio', 'quarter_batch', 'manager_id', 'is_active',
        'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        }
      ]
    });

    res.json({
      message: `Member access ${nextStatus ? 'restored' : 'deactivated'} successfully`,
      member: updated
    });
  } catch (err) {
    console.error('Admin PATCH /members/:id/status error:', err);
    res.status(500).json({ message: 'Failed to update member status' });
  }
});

// =============================================================================
// 6. PATCH /api/admin/members/:id/reset-password - Quick Password Reset
// =============================================================================
router.patch('/members/:id/reset-password', async (req, res) => {
  try {
    const memberId = parseInt(req.params.id, 10);
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    const targetUser = await User.findByPk(memberId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Member not found' });
    }

    targetUser.password = await bcrypt.hash(password, 10);
    targetUser.plain_password = password;
    await targetUser.save();

    res.json({
      message: `Password for ${targetUser.name} has been reset successfully`,
      memberId: targetUser.id,
      plain_password: password
    });
  } catch (err) {
    console.error('Admin PATCH /members/:id/reset-password error:', err);
    res.status(500).json({ message: 'Failed to reset employee password' });
  }
});

module.exports = router;
