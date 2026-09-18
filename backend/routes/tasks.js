const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Plan = require('../models/Plan');
const auth = require('../middleware/auth');
const sequelize = require('../config/database');

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

// POST /api/tasks/assign-self
// Manager assigns a self-review to direct subordinates
router.post('/assign-self', auth, async (req, res) => {
  try {
    // 1. Authoritative check: load manager from database
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'Manager account not found' });
    }

    if (manager.role === 'admin') {
      return res.status(403).json({ message: 'Administrators are not permitted to assign reviews' });
    }

    const allowedRoles = ['team_manager', 'department_manager', 'hr_manager', 'operational_manager'];
    if (!allowedRoles.includes(manager.role)) {
      return res.status(403).json({ message: 'Only managers can assign self-reviews' });
    }

    const { employeeIds, message, quarter, year } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'No employees or department heads selected' });
    }

    const activeCycle = getActiveQuarterAndYear();
    const currentYear = year ? parseInt(year, 10) : activeCycle.year;
    if (quarter !== activeCycle.quarter || currentYear !== activeCycle.year) {
      return res.status(400).json({
        message: `Reviews can only be assigned for the active operational cycle (${activeCycle.quarter} ${activeCycle.year}). Past or future cycles cannot be assigned.`
      });
    }

    // 2. Validate recipients against manager's hierarchy
    const recipients = await User.findAll({
      where: { id: employeeIds }
    });

    if (recipients.length !== employeeIds.length) {
      return res.status(400).json({ message: 'One or more selected recipients were not found' });
    }

    if (manager.role === 'operational_manager') {
      const allDirectDeptHeads = recipients.every(r =>
        r.manager_id === manager.id &&
        ['department_manager', 'hr_manager'].includes(r.role)
      );
      if (!allDirectDeptHeads) {
        return res.status(403).json({
          message: 'Selected recipients must all be direct Department Heads reporting to the Operational Manager'
        });
      }
    } else if (manager.role === 'hr_manager') {
      const allDirectHrEmps = recipients.every(r =>
        r.manager_id === manager.id &&
        r.role === 'employee' &&
        (r.department === 'Human Resources' || r.department === 'HR')
      );
      if (!allDirectHrEmps) {
        return res.status(403).json({
          message: 'Selected recipients must all be direct HR Employees reporting to the HR Head'
        });
      }
    } else if (manager.role === 'department_manager') {
      const allDirectTMs = recipients.every(r =>
        r.manager_id === manager.id &&
        r.department === manager.department &&
        r.role === 'team_manager'
      );
      if (!allDirectTMs) {
        return res.status(403).json({
          message: 'Selected recipients must all be direct Team Managers in your department'
        });
      }
    } else if (manager.role === 'team_manager') {
      const allDirectReports = recipients.every(r =>
        r.manager_id === manager.id &&
        r.department === manager.department &&
        r.team === manager.team &&
        r.role === 'employee' &&
        r.quarter_batch === quarter
      );
      if (!allDirectReports) {
        return res.status(403).json({
          message: 'Selected recipients must all be direct employees in your team for the active quarter'
        });
      }
    }

    const result = await sequelize.transaction(async (t) => {
      // Lock the recipient User rows to serialize concurrent self-review assignments
      await User.findAll({
        where: { id: employeeIds },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const existingTasks = await Task.findAll({
        where: {
          type: 'self_review',
          assignee_id: employeeIds,
          quarter,
          year: currentYear
        },
        transaction: t
      });

      if (existingTasks.length > 0) {
        const conflictErr = new Error(`One or more selected recipients already have a self-review assigned for ${quarter} ${currentYear}.`);
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      const cleanMessage = message && typeof message === 'string' ? message.trim() : null;

      const taskIds = [];
      for (const empId of employeeIds) {
        const tObj = await Task.create({
          type: 'self_review',
          feedback_type: 'self',
          assignee_id: empId,
          reviewee_id: empId,
          quarter,
          year: currentYear,
          message: cleanMessage,
          status: 'pending'
        }, { transaction: t });
        taskIds.push(tObj.id);
      }

      // Create notifications for assignees
      const notifIds = [];
      for (let i = 0; i < employeeIds.length; i++) {
        const empId = employeeIds[i];
        const taskId = taskIds[i];
        const nObj = await Notification.create({
          user_id: empId,
          message: `You have been assigned a Self Review for ${quarter} ${currentYear}.`,
          link: '/my-tasks',
          entity_type: 'task',
          entity_id: taskId
        }, { transaction: t });
        notifIds.push(nObj.id);
      }

      return { taskIds, notifIds };
    });

    res.json({
      message: 'Self-reviews assigned successfully',
      taskIds: result.taskIds,
      notificationIds: result.notifIds
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Error assigning self-review:', err.message);
    res.status(500).send('Server error');
  }
});

// GET /api/tasks/my-tasks
// Reviewer fetches their assigned tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        assignee_id: req.user.id
      },
      include: [
        { model: User, as: 'reviewee', attributes: ['id', 'name', 'email'] },
        {
          model: Plan,
          as: 'plan',
          include: [
            { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Populate group subjects count/names for downward reviews
    const allGroupSubjectIds = [];
    tasks.forEach(t => {
      let subjectIds = t.group_subject_ids;
      if (typeof subjectIds === 'string') {
        try { subjectIds = JSON.parse(subjectIds); } catch { subjectIds = []; }
      }
      if (Array.isArray(subjectIds)) {
        allGroupSubjectIds.push(...subjectIds);
      }
    });

    let subjectUsersMap = {};
    if (allGroupSubjectIds.length > 0) {
      const subjectUsers = await User.findAll({
        where: { id: allGroupSubjectIds },
        attributes: ['id', 'name', 'email', 'role', 'team', 'department']
      });
      subjectUsers.forEach(u => {
        subjectUsersMap[u.id] = u.toJSON();
      });
    }

    const formattedTasks = tasks.map(t => {
      const json = t.toJSON();
      let subjectIds = json.group_subject_ids;
      if (typeof subjectIds === 'string') {
        try { subjectIds = JSON.parse(subjectIds); } catch { subjectIds = []; }
      }
      if (Array.isArray(subjectIds)) {
        json.group_subject_ids = subjectIds;
        json.groupSubjects = subjectIds.map(id => subjectUsersMap[id]).filter(Boolean);
      }
      return json;
    });

    res.json(formattedTasks);
  } catch (err) {
    console.error('Error in GET /api/tasks/my-tasks:', err);
    res.status(500).send('Server Error');
  }
});

// GET /api/tasks/:id
// Reviewer fetches details of an assigned task (including group subjects and draft content)
router.get('/:id', auth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'reviewee', attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'profile_picture'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignee_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not the assigned reviewer for this task' });
    }

    let subjects = [];
    let subjectIds = task.group_subject_ids;
    if (typeof subjectIds === 'string') {
      try { subjectIds = JSON.parse(subjectIds); } catch { subjectIds = []; }
    }
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      subjects = await User.findAll({
        where: { id: subjectIds },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'profile_picture'],
        order: [['name', 'ASC']]
      });
    }

    res.json({
      task: {
        ...task.toJSON(),
        subjects: subjects.map(s => s.toJSON())
      }
    });
  } catch (err) {
    console.error('Error fetching task details:', err);
    res.status(500).json({ message: 'Server error retrieving task details' });
  }
});

// POST /api/tasks/assign-peer
// Redesigned peer review assignment supporting:
// 1. Same-Level Peer Reviews (peerType: 'same_level')
// 2. Manager Reviews Direct Reports (peerType: 'manager_to_reports' — Downward / Grouped)
// 3. Direct Reports Review Their Manager (peerType: 'reports_to_manager' — Upward)
router.post('/assign-peer', auth, async (req, res) => {
  try {
    // Authoritative manager check
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'Manager account not found' });
    }

    if (manager.role === 'admin') {
      return res.status(403).json({ message: 'Administrators are not permitted to assign reviews' });
    }

    const allowedRoles = ['team_manager', 'department_manager', 'hr_manager', 'operational_manager'];
    if (!allowedRoles.includes(manager.role)) {
      return res.status(403).json({ message: 'Only managers can assign reviews' });
    }

    const {
      peerType = 'same_level',
      subjectId: rawSubjectId,
      employeeId: rawEmpId,
      reviewer1Id: rawR1Id,
      reviewer2Id: rawR2Id,
      peer1Id: rawP1Id,
      peer2Id: rawP2Id,
      team,
      department,
      message,
      quarter,
      year,
      expectedSubjectIds,
      expectedReviewerIds
    } = req.body;

    const activeCycle = getActiveQuarterAndYear();
    const currentYear = year ? parseInt(year, 10) : activeCycle.year;
    if (quarter !== activeCycle.quarter || currentYear !== activeCycle.year) {
      return res.status(400).json({
        message: `Reviews can only be assigned for the active operational cycle (${activeCycle.quarter} ${activeCycle.year}). Past or future cycles cannot be assigned.`
      });
    }

    const cleanMessage = message && typeof message === 'string' ? message.trim() : null;

    // =========================================================================
    // PEER TYPE 2: MANAGER REVIEWS DIRECT REPORTS (Downward / Grouped)
    // =========================================================================
    if (peerType === 'manager_to_reports') {
      if (manager.role === 'team_manager' || manager.role === 'hr_manager') {
        return res.status(403).json({ message: 'Only Department Managers and Operational Manager can initiate downward reviews' });
      }

      let reviewer = null;
      let directReports = [];

      if (manager.role === 'department_manager') {
        if (!team) {
          return res.status(400).json({ message: 'A team must be selected to assign downward reviews' });
        }

        reviewer = await User.findOne({
          where: {
            manager_id: manager.id,
            department: manager.department,
            team,
            role: 'team_manager'
          }
        });

        if (!reviewer) {
          return res.status(404).json({ message: `Team Manager for team "${team}" not found in ${manager.department}` });
        }

        directReports = await User.findAll({
          where: {
            manager_id: reviewer.id,
            department: manager.department,
            team: reviewer.team,
            role: 'employee',
            quarter_batch: quarter
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      } else if (manager.role === 'operational_manager') {
        if (!department) {
          return res.status(400).json({ message: 'A department must be selected to assign downward reviews' });
        }

        reviewer = await User.findOne({
          where: {
            manager_id: manager.id,
            department: department === 'HR' ? 'Human Resources' : department
          }
        });

        if (!reviewer) {
          return res.status(404).json({ message: `Department head for "${department}" not found` });
        }

        if (reviewer.role === 'department_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: reviewer.id,
              department: reviewer.department,
              role: 'team_manager'
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        } else if (reviewer.role === 'hr_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: reviewer.id,
              role: 'employee',
              department: ['Human Resources', 'HR']
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        }
      }

      if (directReports.length === 0) {
        return res.status(400).json({
          message: `No active subordinates found reporting to ${reviewer.name} for ${quarter}. Cannot assign an empty review group.`
        });
      }

      // Roster Mismatch Check: Verify against preview expectations
      if (expectedSubjectIds && Array.isArray(expectedSubjectIds)) {
        const currentDrIds = directReports.map(dr => dr.id).sort();
        const expectedSorted = [...expectedSubjectIds].sort();
        const match = currentDrIds.length === expectedSorted.length && currentDrIds.every((id, idx) => id === expectedSorted[idx]);
        if (!match) {
          return res.status(409).json({
            message: 'Direct reports roster has changed since preview was generated. Please refresh the preview before assigning.',
            code: 'ROSTER_MISMATCH'
          });
        }
      }

      const subjectIds = directReports.map(dr => dr.id);

      const result = await sequelize.transaction(async (t) => {
        // Lock the reviewer User row to serialize concurrent assignments
        await User.findByPk(reviewer.id, { transaction: t, lock: t.LOCK.UPDATE });

        const existingTask = await Task.findOne({
          where: {
            type: 'downward_review',
            assignee_id: reviewer.id,
            quarter,
            year: currentYear
          },
          transaction: t
        });

        if (existingTask) {
          const conflictErr = new Error(`Downward review task already assigned to ${reviewer.name} for ${quarter} ${currentYear}.`);
          conflictErr.statusCode = 409;
          throw conflictErr;
        }

        const task = await Task.create({
          type: 'downward_review',
          feedback_type: 'downward',
          assignee_id: reviewer.id,
          reviewee_id: subjectIds[0], // primary subject reference for backward compatibility
          group_subject_ids: subjectIds,
          quarter,
          year: currentYear,
          message: cleanMessage,
          status: 'pending'
        }, { transaction: t });

        const notif = await Notification.create({
          user_id: reviewer.id,
          message: `You have been assigned to complete downward reviews for ${subjectIds.length} team member(s) (${quarter} ${currentYear}).`,
          link: '/my-tasks',
          entity_type: 'task',
          entity_id: task.id
        }, { transaction: t });

        return { taskId: task.id, notifId: notif.id, subjectsCount: subjectIds.length, reviewerName: reviewer.name };
      });

      return res.json({
        message: `Group downward review task assigned to ${result.reviewerName} for ${result.subjectsCount} direct reports.`,
        taskIds: [result.taskId],
        notificationIds: [result.notifId]
      });
    }

    // =========================================================================
    // PEER TYPE 3: DIRECT REPORTS REVIEW THEIR MANAGER (Upward Reviews)
    // =========================================================================
    if (peerType === 'reports_to_manager') {
      if (manager.role === 'team_manager' || manager.role === 'hr_manager') {
        return res.status(403).json({ message: 'Only Department Managers and Operational Manager can initiate upward reviews' });
      }

      let subject = null;
      let directReports = [];

      if (manager.role === 'department_manager') {
        if (!team) {
          return res.status(400).json({ message: 'A team must be selected to assign upward reviews' });
        }

        subject = await User.findOne({
          where: {
            manager_id: manager.id,
            department: manager.department,
            team,
            role: 'team_manager'
          }
        });

        if (!subject) {
          return res.status(404).json({ message: `Team Manager for team "${team}" not found in ${manager.department}` });
        }

        directReports = await User.findAll({
          where: {
            manager_id: subject.id,
            department: manager.department,
            team: subject.team,
            role: 'employee',
            quarter_batch: quarter
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
          order: [['name', 'ASC']]
        });
      } else if (manager.role === 'operational_manager') {
        if (!department) {
          return res.status(400).json({ message: 'A department must be selected to assign upward reviews' });
        }

        subject = await User.findOne({
          where: {
            manager_id: manager.id,
            department: department === 'HR' ? 'Human Resources' : department
          }
        });

        if (!subject) {
          return res.status(404).json({ message: `Department head for "${department}" not found` });
        }

        if (subject.role === 'department_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: subject.id,
              department: subject.department,
              role: 'team_manager'
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        } else if (subject.role === 'hr_manager') {
          directReports = await User.findAll({
            where: {
              manager_id: subject.id,
              role: 'employee',
              department: ['Human Resources', 'HR']
            },
            attributes: ['id', 'name', 'email', 'role', 'department', 'team'],
            order: [['name', 'ASC']]
          });
        }
      }

      if (directReports.length === 0) {
        return res.status(400).json({
          message: `No active subordinates found reporting to ${subject.name} for ${quarter}. Cannot assign upward reviews.`
        });
      }

      // Roster Mismatch Check: Verify against preview expectations
      if (expectedReviewerIds && Array.isArray(expectedReviewerIds)) {
        const currentDrIds = directReports.map(dr => dr.id).sort();
        const expectedSorted = [...expectedReviewerIds].sort();
        const match = currentDrIds.length === expectedSorted.length && currentDrIds.every((id, idx) => id === expectedSorted[idx]);
        if (!match) {
          return res.status(409).json({
            message: 'Direct reports roster has changed since preview was generated. Please refresh the preview before assigning.',
            code: 'ROSTER_MISMATCH'
          });
        }
      }

      const directReportIds = directReports.map(dr => dr.id);

      const result = await sequelize.transaction(async (t) => {
        // Lock the subject and direct report User rows
        await User.findAll({
          where: { id: [subject.id, ...directReportIds] },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        const existingTasks = await Task.findAll({
          where: {
            type: 'peer_review',
            feedback_type: 'upward',
            reviewee_id: subject.id,
            assignee_id: directReportIds,
            quarter,
            year: currentYear
          },
          transaction: t
        });

        const existingAssigneeIds = new Set(existingTasks.map(t => t.assignee_id));
        const neededReviewers = directReports.filter(r => !existingAssigneeIds.has(r.id));

        if (neededReviewers.length === 0) {
          const conflictErr = new Error(`All direct reports have already been assigned upward reviews for ${subject.name} for ${quarter} ${currentYear}.`);
          conflictErr.statusCode = 409;
          throw conflictErr;
        }

        const taskIds = [];
        const notifIds = [];

        for (const dr of neededReviewers) {
          const task = await Task.create({
            type: 'peer_review',
            feedback_type: 'upward',
            assignee_id: dr.id,
            reviewee_id: subject.id,
            quarter,
            year: currentYear,
            message: cleanMessage,
            status: 'pending'
          }, { transaction: t });

          taskIds.push(task.id);

          const notif = await Notification.create({
            user_id: dr.id,
            message: `You have been assigned to provide an upward review for your manager ${subject.name} (${quarter} ${currentYear}).`,
            link: '/my-tasks',
            entity_type: 'task',
            entity_id: task.id
          }, { transaction: t });

          notifIds.push(notif.id);
        }

        return { taskIds, notifIds, assignedCount: neededReviewers.length, subjectName: subject.name, alreadyAssignedCount: existingTasks.length };
      });

      return res.json({
        message: `Upward reviews assigned: ${result.assignedCount} new task(s) created for direct reports of ${result.subjectName}${result.alreadyAssignedCount > 0 ? ` (${result.alreadyAssignedCount} were already assigned)` : ''}.`,
        taskIds: result.taskIds,
        notificationIds: result.notifIds
      });
    }

    // =========================================================================
    // PEER TYPE 1: SAME-LEVEL PEER REVIEWS
    // =========================================================================
    const subjectId = rawSubjectId || rawEmpId;
    const reviewer1Id = rawR1Id || rawP1Id;
    const reviewer2Id = rawR2Id || rawP2Id;

    if (!subjectId || !reviewer1Id || !reviewer2Id) {
      return res.status(400).json({ message: 'Subject and exactly 2 distinct peer reviewers are required for same-level review' });
    }

    const reviewerIds = [parseInt(reviewer1Id, 10), parseInt(reviewer2Id, 10)];
    if (reviewerIds[0] === reviewerIds[1]) {
      return res.status(400).json({ message: 'Reviewer 1 and Reviewer 2 must be different people' });
    }

    if (reviewerIds.includes(parseInt(subjectId, 10))) {
      return res.status(400).json({ message: 'The subject cannot be selected as their own peer reviewer' });
    }

    // Roster Mismatch Check: Verify against preview expectations if provided
    if (expectedReviewerIds && Array.isArray(expectedReviewerIds)) {
      const sortedExpected = [...expectedReviewerIds].map(Number).sort();
      const sortedActual = [...reviewerIds].sort();
      const match = sortedExpected.length === sortedActual.length && sortedExpected.every((id, idx) => id === sortedActual[idx]);
      if (!match) {
        return res.status(409).json({
          message: 'Selected reviewers differ from the verified preview. Please refresh the preview.',
          code: 'ROSTER_MISMATCH'
        });
      }
    }

    // Authoritative hierarchy validation for subject and reviewers
    const [subjectUser, rev1User, rev2User] = await Promise.all([
      User.findByPk(subjectId),
      User.findByPk(reviewerIds[0]),
      User.findByPk(reviewerIds[1])
    ]);

    if (!subjectUser || !rev1User || !rev2User) {
      return res.status(400).json({ message: 'Subject or one of the reviewers was not found' });
    }

    if (manager.role === 'team_manager') {
      const allInTeam = [subjectUser, rev1User, rev2User].every(u =>
        u.manager_id === manager.id &&
        u.department === manager.department &&
        u.team === manager.team &&
        u.role === 'employee' &&
        u.quarter_batch === quarter
      );
      if (!allInTeam) {
        return res.status(403).json({ message: 'Subject and reviewers must all be employees in your team active in this quarter' });
      }
    } else if (manager.role === 'department_manager') {
      const allInDept = [subjectUser, rev1User, rev2User].every(u =>
        u.manager_id === manager.id &&
        u.department === manager.department &&
        u.role === 'team_manager'
      );
      if (!allInDept) {
        return res.status(403).json({ message: 'Subject and reviewers must all be Team Managers in your department' });
      }
    } else if (manager.role === 'operational_manager') {
      const allDirectHeads = [subjectUser, rev1User, rev2User].every(u =>
        u.manager_id === manager.id &&
        ['department_manager', 'hr_manager'].includes(u.role)
      );
      if (!allDirectHeads) {
        return res.status(403).json({ message: 'Subject and reviewers must all be Department Heads reporting directly to the Operational Manager' });
      }
    } else if (manager.role === 'hr_manager') {
      const allHrEmps = [subjectUser, rev1User, rev2User].every(u =>
        u.manager_id === manager.id &&
        (u.department === 'Human Resources' || u.department === 'HR') &&
        u.role === 'employee'
      );
      if (!allHrEmps) {
        return res.status(403).json({ message: 'Subject and reviewers must all be HR Employees reporting directly to the HR Head' });
      }
    }

    const result = await sequelize.transaction(async (t) => {
      // Lock the subject and reviewer rows to serialize concurrent assignments
      await User.findAll({
        where: { id: [subjectUser.id, ...reviewerIds] },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const existingTasks = await Task.findAll({
        where: {
          type: 'peer_review',
          reviewee_id: subjectUser.id,
          assignee_id: reviewerIds,
          quarter,
          year: currentYear
        },
        transaction: t
      });

      const existingAssigneeIds = new Set(existingTasks.map(t => t.assignee_id));
      const neededReviewerIds = reviewerIds.filter(id => !existingAssigneeIds.has(id));

      if (neededReviewerIds.length === 0) {
        const conflictErr = new Error(`All selected reviewers are already assigned for ${subjectUser.name} for ${quarter} ${currentYear}.`);
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      const taskIds = [];
      const notifIds = [];

      for (const revId of neededReviewerIds) {
        const task = await Task.create({
          type: 'peer_review',
          feedback_type: 'peer',
          assignee_id: revId,
          reviewee_id: subjectUser.id,
          quarter,
          year: currentYear,
          message: cleanMessage,
          status: 'pending'
        }, { transaction: t });

        taskIds.push(task.id);

        const notif = await Notification.create({
          user_id: revId,
          message: `You have been assigned a Peer Review for ${subjectUser.name} (${quarter} ${currentYear}).`,
          link: '/my-tasks',
          entity_type: 'task',
          entity_id: task.id
        }, { transaction: t });

        notifIds.push(notif.id);
      }

      return { taskIds, notifIds, assignedCount: neededReviewerIds.length, alreadyAssignedCount: existingTasks.length, subjectName: subjectUser.name };
    });

    res.json({
      message: `Peer review assigned for ${result.subjectName}: ${result.assignedCount} new task(s) created${result.alreadyAssignedCount > 0 ? ` (${result.alreadyAssignedCount} reviewer was already assigned)` : ''}.`,
      taskIds: result.taskIds,
      notificationIds: result.notifIds
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Error assigning peer review:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
