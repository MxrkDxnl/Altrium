const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads with verified absolute directory
const PROFILES_STORAGE_DIR = path.resolve(__dirname, '../uploads/profiles');
if (!fs.existsSync(PROFILES_STORAGE_DIR)) {
  fs.mkdirSync(PROFILES_STORAGE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(PROFILES_STORAGE_DIR)) {
      fs.mkdirSync(PROFILES_STORAGE_DIR, { recursive: true });
    }
    cb(null, PROFILES_STORAGE_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      return cb(new Error('Only image files (PNG, JPG, JPEG, WEBP) are allowed.'));
    }
    cb(null, true);
  }
});

// GET /api/users/me
// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch', 'profile_picture']
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

const Task = require('../models/Task');
const { Op } = require('sequelize');

// Determine active quarter in Asia/Colombo
function getActiveQuarterAndYear() {
  const colomboFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = colomboFormatter.formatToParts(new Date());
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);

  let quarter;
  if (month >= 1 && month <= 4) {
    quarter = 'Q1';
  } else if (month >= 5 && month <= 8) {
    quarter = 'Q2';
  } else {
    quarter = 'Q3';
  }
  return { quarter, year };
}

// GET /api/users/eligible
// Get users for assigning tasks (filtered by quarter_batch, manager, and peer_type)
router.get('/eligible', auth, async (req, res) => {
  try {
    const { quarter_batch, review_type, peer_type, year, subject_id, team, department } = req.query;
    const activeCycle = getActiveQuarterAndYear();
    const currentYear = year ? parseInt(year, 10) : activeCycle.year;

    // 1. Authoritative check: load manager from database
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (manager.role === 'admin') {
      return res.status(403).json({ message: 'Administrators are not permitted to assign reviews' });
    }

    const allowedRoles = ['team_manager', 'department_manager', 'hr_manager', 'operational_manager', 'company_manager'];
    if (!allowedRoles.includes(manager.role)) {
      return res.status(403).json({ message: 'Only managers can fetch eligible users' });
    }

    // Determine cycle quarter (Asia/Colombo)
    let cycleQuarter = quarter_batch;
    if (!cycleQuarter || !['Q1', 'Q2', 'Q3'].includes(cycleQuarter)) {
      cycleQuarter = activeCycle.quarter;
    }

    // =========================================================================
    // MODE 1: SELF REVIEW (All manager roles)
    // =========================================================================
    if (review_type === 'self_review') {
      let subordinates = [];
      if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
        subordinates = await User.findAll({
          where: { manager_id: manager.id },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      } else if (manager.role === 'hr_manager') {
        subordinates = await User.findAll({
          where: { manager_id: manager.id, role: 'employee', department: ['Human Resources', 'HR'] },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      } else if (manager.role === 'department_manager') {
        subordinates = await User.findAll({
          where: { manager_id: manager.id, department: manager.department, role: 'team_manager' },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      } else if (manager.role === 'team_manager') {
        subordinates = await User.findAll({
          where: {
            manager_id: manager.id,
            department: manager.department,
            team: manager.team,
            role: 'employee',
            ...(cycleQuarter ? { quarter_batch: cycleQuarter } : {})
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      }

      const userIds = subordinates.map(u => u.id);
      let assignedUserIds = [];
      if (userIds.length > 0) {
        const existingTasks = await Task.findAll({
          where: {
            quarter: cycleQuarter,
            year: currentYear,
            type: 'self_review',
            assignee_id: userIds
          },
          attributes: ['assignee_id']
        });
        assignedUserIds = existingTasks.map(t => t.assignee_id);
      }

      const usersWithFlag = subordinates.map(u => ({
        ...u.toJSON(),
        isAssigned: assignedUserIds.includes(u.id)
      }));

      return res.json(usersWithFlag);
    }

    // =========================================================================
    // MODE 2: PEER TYPE 2 - MANAGER REVIEWS DIRECT REPORTS (Downward / Grouped)
    // =========================================================================
    if (review_type === 'peer_review' && peer_type === 'manager_to_reports') {
      if (!['department_manager', 'operational_manager', 'company_manager'].includes(manager.role)) {
        return res.status(403).json({ message: 'Only Department Managers and Operational Manager can initiate downward reviews' });
      }

      // Department Manager selecting a team
      if (manager.role === 'department_manager') {
        const teamManagers = await User.findAll({
          where: {
            manager_id: manager.id,
            department: manager.department,
            role: 'team_manager'
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
          order: [['team', 'ASC']]
        });

        if (!team) {
          // Return list of available teams with TM info
          const availableTeams = teamManagers.map(tm => ({
            team: tm.team,
            teamManager: tm.toJSON()
          }));
          return res.json({ teams: availableTeams });
        }

        const targetTM = teamManagers.find(tm => tm.team === team);
        if (!targetTM) {
          return res.status(404).json({ message: `Team Manager for team "${team}" not found in ${manager.department}` });
        }

        // Find all active-quarter direct employees for this TM
        const directEmployees = await User.findAll({
          where: {
            manager_id: targetTM.id,
            department: manager.department,
            team: targetTM.team,
            role: 'employee',
            ...(cycleQuarter ? { quarter_batch: cycleQuarter } : {})
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });

        // Check if a downward review task already exists for targetTM
        const existingTask = await Task.findOne({
          where: {
            assignee_id: targetTM.id,
            type: 'downward_review',
            quarter: cycleQuarter,
            year: currentYear
          }
        });

        return res.json({
          reviewer: targetTM.toJSON(),
          subjects: directEmployees.map(e => e.toJSON()),
          isAssigned: !!existingTask,
          existingTaskId: existingTask?.id || null,
          existingTaskStatus: existingTask?.status || null
        });
      }

      // Operational / Company Manager selecting a Department
      if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
        const availableDepts = [
          { department: 'IT', label: 'IT Department (Dinesh Jayawardena)' },
          { department: 'Finance', label: 'Finance Department (Chamari Perera)' },
          { department: 'HR', label: 'Human Resources (Amaya Senanayake)' }
        ];

        if (!department) {
          return res.json({ departments: availableDepts });
        }

        const deptHead = await User.findOne({
          where: {
            manager_id: manager.id,
            department: department === 'HR' ? 'Human Resources' : department
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        });

        if (!deptHead) {
          return res.status(404).json({ message: `Department head for "${department}" not found` });
        }

        // Direct reports of this department head
        let directReports = [];
        if (deptHead.role === 'department_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: deptHead.id,
              department: deptHead.department,
              role: 'team_manager'
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        } else if (deptHead.role === 'hr_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: deptHead.id,
              role: 'employee',
              department: ['Human Resources', 'HR']
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
            order: [['name', 'ASC']]
          });
        }

        const existingTask = await Task.findOne({
          where: {
            assignee_id: deptHead.id,
            type: 'downward_review',
            quarter: cycleQuarter,
            year: currentYear
          }
        });

        return res.json({
          reviewer: deptHead.toJSON(),
          subjects: directReports.map(e => e.toJSON()),
          isAssigned: !!existingTask,
          existingTaskId: existingTask?.id || null,
          existingTaskStatus: existingTask?.status || null
        });
      }
    }

    // =========================================================================
    // MODE 3: PEER TYPE 3 - DIRECT REPORTS REVIEW THEIR MANAGER (Upward / Many-to-One)
    // =========================================================================
    if (review_type === 'peer_review' && peer_type === 'reports_to_manager') {
      if (!['department_manager', 'operational_manager', 'company_manager'].includes(manager.role)) {
        return res.status(403).json({ message: 'Only Department Managers and Operational Manager can initiate upward reviews' });
      }

      // Department Manager selecting a team
      if (manager.role === 'department_manager') {
        const teamManagers = await User.findAll({
          where: {
            manager_id: manager.id,
            department: manager.department,
            role: 'team_manager'
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
          order: [['team', 'ASC']]
        });

        if (!team) {
          const availableTeams = teamManagers.map(tm => ({
            team: tm.team,
            teamManager: tm.toJSON()
          }));
          return res.json({ teams: availableTeams });
        }

        const targetTM = teamManagers.find(tm => tm.team === team);
        if (!targetTM) {
          return res.status(404).json({ message: `Team Manager for team "${team}" not found in ${manager.department}` });
        }

        // Reviewers: All active-quarter direct employees of that TM
        const directEmployees = await User.findAll({
          where: {
            manager_id: targetTM.id,
            department: manager.department,
            team: targetTM.team,
            role: 'employee',
            ...(cycleQuarter ? { quarter_batch: cycleQuarter } : {})
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });

        const empIds = directEmployees.map(e => e.id);
        const existingUpwardTasks = await Task.findAll({
          where: {
            assignee_id: empIds,
            reviewee_id: targetTM.id,
            type: 'upward_review',
            quarter: cycleQuarter,
            year: currentYear
          },
          attributes: ['assignee_id']
        });
        const assignedEmpIds = existingUpwardTasks.map(t => t.assignee_id);

        const reviewersWithFlag = directEmployees.map(emp => ({
          ...emp.toJSON(),
          isAssigned: assignedEmpIds.includes(emp.id)
        }));

        return res.json({
          subject: targetTM.toJSON(),
          reviewers: reviewersWithFlag,
          totalCount: directEmployees.length,
          assignedCount: assignedEmpIds.length,
          isFullyAssigned: directEmployees.length > 0 && assignedEmpIds.length >= directEmployees.length
        });
      }

      // Operational / Company Manager selecting a Department
      if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
        const availableDepts = [
          { department: 'IT', label: 'IT Department (Dinesh Jayawardena)' },
          { department: 'Finance', label: 'Finance Department (Chamari Perera)' },
          { department: 'HR', label: 'Human Resources (Amaya Senanayake)' }
        ];

        if (!department) {
          return res.json({ departments: availableDepts });
        }

        const deptHead = await User.findOne({
          where: {
            manager_id: manager.id,
            department: department === 'HR' ? 'Human Resources' : department
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        });

        if (!deptHead) {
          return res.status(404).json({ message: `Department head for "${department}" not found` });
        }

        let directReports = [];
        if (deptHead.role === 'department_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: deptHead.id,
              department: deptHead.department,
              role: 'team_manager'
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        } else if (deptHead.role === 'hr_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: deptHead.id,
              role: 'employee',
              department: ['Human Resources', 'HR']
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
            order: [['name', 'ASC']]
          });
        }

        const repIds = directReports.map(e => e.id);
        const existingUpwardTasks = await Task.findAll({
          where: {
            assignee_id: repIds,
            reviewee_id: deptHead.id,
            type: 'upward_review',
            quarter: cycleQuarter,
            year: currentYear
          },
          attributes: ['assignee_id']
        });
        const assignedRepIds = existingUpwardTasks.map(t => t.assignee_id);

        const reviewersWithFlag = directReports.map(rep => ({
          ...rep.toJSON(),
          isAssigned: assignedRepIds.includes(rep.id)
        }));

        return res.json({
          subject: deptHead.toJSON(),
          reviewers: reviewersWithFlag,
          totalCount: directReports.length,
          assignedCount: assignedRepIds.length,
          isFullyAssigned: directReports.length > 0 && assignedRepIds.length >= directReports.length
        });
      }
    }

    // =========================================================================
    // MODE 4: PEER TYPE 1 - SAME LEVEL REVIEWS (2 Reviewers to 1 Subject)
    // =========================================================================
    // Operational / Company Manager: Within Department Managers
    if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
      const deptHeads = await User.findAll({
        where: { manager_id: manager.id },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
        order: [['name', 'ASC']]
      });

      if (subject_id) {
        const subjectIdNum = parseInt(subject_id, 10);
        const subject = deptHeads.find(d => d.id === subjectIdNum);
        if (!subject) {
          return res.status(404).json({ message: 'Department head not found' });
        }

        const peers = deptHeads.filter(d => d.id !== subjectIdNum);
        const existingPeerTasks = await Task.findAll({
          where: {
            quarter: cycleQuarter,
            year: currentYear,
            type: 'peer_review',
            reviewee_id: subject.id
          },
          attributes: ['assignee_id']
        });
        const assignedPeerIds = existingPeerTasks.map(t => t.assignee_id);

        return res.json({
          subject: subject.toJSON(),
          peers: peers.map(p => ({
            ...p.toJSON(),
            isAssigned: assignedPeerIds.includes(p.id)
          })),
          existingAssignments: assignedPeerIds,
          isAssigned: assignedPeerIds.length >= 2
        });
      }

      const userIds = deptHeads.map(u => u.id);
      const existingTasks = await Task.findAll({
        where: {
          quarter: cycleQuarter,
          year: currentYear,
          type: 'peer_review',
          reviewee_id: userIds
        },
        attributes: ['reviewee_id']
      });

      const countBySubject = {};
      for (const t of existingTasks) {
        countBySubject[t.reviewee_id] = (countBySubject[t.reviewee_id] || 0) + 1;
      }

      const usersWithFlag = deptHeads.map(u => {
        const count = countBySubject[u.id] || 0;
        return {
          ...u.toJSON(),
          peerReviewCount: count,
          requiredReviewers: 2,
          isAssigned: count >= 2
        };
      });

      return res.json(usersWithFlag);
    }

    // HR Manager: Within HR Employees
    if (manager.role === 'hr_manager') {
      const hrEmployees = await User.findAll({
        where: { manager_id: manager.id, role: 'employee', department: ['Human Resources', 'HR'] },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch'],
        order: [['name', 'ASC']]
      });

      if (subject_id) {
        const subjectIdNum = parseInt(subject_id, 10);
        const subject = hrEmployees.find(e => e.id === subjectIdNum);
        if (!subject) {
          return res.status(404).json({ message: 'HR Employee not found' });
        }
        const peers = hrEmployees.filter(e => e.id !== subjectIdNum);
        const existingPeerTasks = await Task.findAll({
          where: {
            quarter: cycleQuarter,
            year: currentYear,
            type: 'peer_review',
            reviewee_id: subject.id
          },
          attributes: ['assignee_id']
        });
        const assignedPeerIds = existingPeerTasks.map(t => t.assignee_id);

        return res.json({
          subject: subject.toJSON(),
          peers: peers.map(p => ({
            ...p.toJSON(),
            isAssigned: assignedPeerIds.includes(p.id)
          })),
          existingAssignments: assignedPeerIds,
          isAssigned: assignedPeerIds.length >= 2
        });
      }

      const userIds = hrEmployees.map(u => u.id);
      const existingTasks = await Task.findAll({
        where: {
          quarter: cycleQuarter,
          year: currentYear,
          type: 'peer_review',
          reviewee_id: userIds
        },
        attributes: ['reviewee_id']
      });

      const countBySubject = {};
      for (const t of existingTasks) {
        countBySubject[t.reviewee_id] = (countBySubject[t.reviewee_id] || 0) + 1;
      }

      const usersWithFlag = hrEmployees.map(u => {
        const count = countBySubject[u.id] || 0;
        return {
          ...u.toJSON(),
          peerReviewCount: count,
          requiredReviewers: 2,
          isAssigned: count >= 2
        };
      });

      return res.json(usersWithFlag);
    }

    // IT / Finance Department Manager & Team Manager: Same-Level Peers
    let poolUsers = [];
    if (manager.role === 'team_manager') {
      poolUsers = await User.findAll({
        where: {
          manager_id: manager.id,
          department: manager.department,
          team: manager.team,
          role: 'employee',
          ...(cycleQuarter ? { quarter_batch: cycleQuarter } : {})
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
        order: [['name', 'ASC']]
      });
    } else if (manager.role === 'department_manager') {
      poolUsers = await User.findAll({
        where: {
          manager_id: manager.id,
          department: manager.department,
          role: 'team_manager'
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
        order: [['name', 'ASC']]
      });
    }

    if (subject_id) {
      const subjectIdNum = parseInt(subject_id, 10);
      const subject = poolUsers.find(u => u.id === subjectIdNum);
      if (!subject) {
        return res.status(404).json({ message: 'Subject not found in your management pool' });
      }

      const eligiblePeers = poolUsers.filter(u => u.id !== subjectIdNum);
      const existingPeerTasks = await Task.findAll({
        where: {
          quarter: cycleQuarter,
          year: currentYear,
          type: 'peer_review',
          reviewee_id: subject.id
        },
        attributes: ['assignee_id']
      });
      const assignedPeerIds = existingPeerTasks.map(t => t.assignee_id);

      return res.json({
        subject: subject.toJSON(),
        eligiblePeers: eligiblePeers.map(p => ({
          ...p.toJSON(),
          isAssigned: assignedPeerIds.includes(p.id)
        })),
        existingAssignments: assignedPeerIds,
        isAssigned: assignedPeerIds.length >= 2
      });
    }

    const userIds = poolUsers.map(u => u.id);
    const peerCountByReviewee = {};

    if (userIds.length > 0) {
      const existingPeerTasks = await Task.findAll({
        where: {
          quarter: cycleQuarter,
          year: currentYear,
          type: 'peer_review',
          reviewee_id: userIds
        },
        attributes: ['reviewee_id']
      });
      for (const t of existingPeerTasks) {
        peerCountByReviewee[t.reviewee_id] = (peerCountByReviewee[t.reviewee_id] || 0) + 1;
      }
    }

    const usersWithFlag = poolUsers.map(user => {
      const peerCount = peerCountByReviewee[user.id] || 0;
      return {
        ...user.toJSON(),
        peerReviewCount: peerCount,
        requiredReviewers: 2,
        isAssigned: peerCount >= 2
      };
    });

    res.json(usersWithFlag);
  } catch (err) {
    console.error('Error fetching eligible users:', err);
    res.status(500).json({ message: 'Server error retrieving eligible users' });
  }
});

// PUT /api/users/profile
// Update user profile (password and profile picture)
router.put('/profile', auth, (req, res, next) => {
  upload.single('profile_picture')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Profile picture must be under 5MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message || 'Invalid image upload' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { password } = req.body;
    const updateData = {};

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.plain_password = password.trim();
    }

    if (req.file) {
      // Clean up previous profile picture file if exists
      const currentUser = await User.findByPk(req.user.id);
      if (currentUser && currentUser.profile_picture && currentUser.profile_picture.startsWith('/uploads/profiles/')) {
        const oldFilename = path.basename(currentUser.profile_picture);
        const oldPath = path.join(PROFILES_STORAGE_DIR, oldFilename);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (_e) {}
        }
      }
      updateData.profile_picture = `/uploads/profiles/${req.file.filename}`;
    }

    if (Object.keys(updateData).length > 0) {
      await User.update(updateData, { where: { id: req.user.id } });
    }

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch', 'profile_picture']
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// DELETE /api/users/profile-picture
// Remove user profile picture
router.delete('/profile-picture', auth, async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (currentUser && currentUser.profile_picture && currentUser.profile_picture.startsWith('/uploads/profiles/')) {
      const oldFilename = path.basename(currentUser.profile_picture);
      const oldPath = path.join(PROFILES_STORAGE_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_e) {}
      }
    }

    await User.update({ profile_picture: null }, { where: { id: req.user.id } });
    
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'quarter_batch', 'profile_picture']
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('Error deleting profile picture:', err);
    res.status(500).json({ message: 'Server error deleting profile picture' });
  }
});

module.exports = router;
