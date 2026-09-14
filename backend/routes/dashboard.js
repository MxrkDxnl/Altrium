const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Evidence = require('../models/Evidence');
const EvidenceFeedback = require('../models/EvidenceFeedback');
const DepartmentReport = require('../models/DepartmentReport');
const { calculatePipDeadline } = require('../utils/pipDeadline');
const { checkQuarterStatus } = require('../utils/quarterCutoff');

// Active Operational Cycle in Asia/Colombo
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
  let range;
  if (month >= 1 && month <= 4) {
    quarter = 'Q1';
    range = 'January – April';
  } else if (month >= 5 && month <= 8) {
    quarter = 'Q2';
    range = 'May – August';
  } else {
    quarter = 'Q3';
    range = 'September – December';
  }
  return { quarter, year, label: `${quarter} ${year}`, range: `${range} ${year}` };
}

// Helper: Count tasks treating grouped downward assignments as 1 task
function aggregateTasksWithGroupedDownward(tasks) {
  let selfAssigned = 0, selfCompleted = 0;
  let peerAssigned = 0, peerCompleted = 0;
  let upwardAssigned = 0, upwardCompleted = 0;
  let downwardAssigned = 0, downwardCompleted = 0;

  for (const t of tasks) {
    const type = t.feedback_type || (t.type ? t.type.replace('_review', '') : null);
    const isCompleted = t.status === 'completed';

    if (type === 'self') {
      selfAssigned++;
      if (isCompleted) selfCompleted++;
    } else if (type === 'peer') {
      peerAssigned++;
      if (isCompleted) peerCompleted++;
    } else if (type === 'upward') {
      upwardAssigned++;
      if (isCompleted) upwardCompleted++;
    } else if (type === 'downward') {
      downwardAssigned++;
      if (isCompleted) downwardCompleted++;
    }
  }

  const buildMetric = (assigned, completed) => {
    const pending = assigned - completed;
    const percentage = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return {
      assigned,
      completed,
      pending,
      percentage,
      hasAssignments: assigned > 0,
      displayStatus: assigned > 0 ? `${percentage}% (${completed}/${assigned})` : 'No assignments'
    };
  };

  const totalAssigned = selfAssigned + peerAssigned + upwardAssigned + downwardAssigned;
  const totalCompleted = selfCompleted + peerCompleted + upwardCompleted + downwardCompleted;

  return {
    self: buildMetric(selfAssigned, selfCompleted),
    peer: buildMetric(peerAssigned, peerCompleted),
    upward: buildMetric(upwardAssigned, upwardCompleted),
    downward: buildMetric(downwardAssigned, downwardCompleted),
    total: buildMetric(totalAssigned, totalCompleted)
  };
}

// GET /api/dashboard
router.get('/', auth, async (req, res) => {
  try {
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    const activeCycle = getActiveQuarterAndYear();
    const cycleStatus = checkQuarterStatus(activeCycle.quarter, activeCycle.year);

    let summaryCards = [];
    let reviewProgress = {};
    let teamOverview = null;
    let pipPdpOverview = null;
    let departmentReportStatus = null;
    const needsAttention = [];

    const isAmaya = (currentUser.role === 'department_manager' || currentUser.role === 'hr_manager') &&
      (currentUser.department === 'Human Resources' || currentUser.department === 'HR');

    // -------------------------------------------------------------
    // 1. DEPARTMENT MANAGERS (Dinesh, Chamari) & AMAYA (HR Head)
    // -------------------------------------------------------------
    if (currentUser.role === 'department_manager' || isAmaya) {
      if (isAmaya) {
        // Amaya: HR Department Head (3 direct HR employees: Ayesha, Ruwan, Nethmi, no TM layer)
        const hrDirects = await User.findAll({
          where: {
            manager_id: currentUser.id,
            role: 'employee'
          },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch', 'report_portfolio', 'profile_picture']
        });

        const hrDirectIds = hrDirects.map(u => u.id);
        const totalHeadcount = hrDirects.length + 1; // Directs + Amaya
        const eligibleCount = hrDirects.filter(u => u.quarter_batch === activeCycle.quarter).length +
          (currentUser.quarter_batch === activeCycle.quarter ? 1 : 0);

        // HR Reviews for active cycle
        const allHrUserIds = [currentUser.id, ...hrDirectIds];
        const hrTasks = await Task.findAll({
          where: {
            assignee_id: { [Op.in]: allHrUserIds },
            quarter: activeCycle.quarter,
            year: activeCycle.year
          }
        });
        reviewProgress = aggregateTasksWithGroupedDownward(hrTasks);

        summaryCards = [
          {
            id: 'direct_reports',
            title: 'Direct HR Team',
            value: hrDirects.length.toString(),
            subtitle: 'Ayesha, Ruwan, Nethmi',
            icon: 'users',
            highlight: 'gold'
          },
          {
            id: 'total_headcount',
            title: 'Total Headcount',
            value: totalHeadcount.toString(),
            subtitle: 'Human Resources Department',
            icon: 'building',
            highlight: 'neutral'
          },
          {
            id: 'eligible_employees',
            title: 'Active-Cycle Eligible',
            value: eligibleCount.toString(),
            subtitle: `Batch ${activeCycle.quarter} (${activeCycle.label})`,
            icon: 'check-circle',
            highlight: 'gold'
          },
          {
            id: 'review_completion',
            title: 'Review Completion',
            value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : 'No tasks',
            subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} reviews completed` : 'No assignments',
            icon: 'clipboard-check',
            highlight: 'gold'
          }
        ];

        // Team / Direct Reports Overview table
        const directReportRows = [];
        for (const direct of hrDirects) {
          const directTasks = await Task.findAll({
            where: {
              assignee_id: direct.id,
              quarter: activeCycle.quarter,
              year: activeCycle.year
            }
          });
          const dProgress = aggregateTasksWithGroupedDownward(directTasks);

          const directPlans = await Plan.findAll({
            where: {
              recipient_id: direct.id,
              status: { [Op.in]: ['pending', 'evidence_submitted'] }
            }
          });

          directReportRows.push({
            id: direct.id,
            name: direct.name,
            email: direct.email,
            roleTitle: direct.report_portfolio ? `HR Specialist (${direct.report_portfolio})` : 'HR Associate',
            quarterBatch: direct.quarter_batch,
            isEligible: direct.quarter_batch === activeCycle.quarter,
            reviewStatus: dProgress.total.hasAssignments ? `${dProgress.total.percentage}% (${dProgress.total.completed}/${dProgress.total.assigned})` : 'No assignments',
            activePlansCount: directPlans.length,
            profilePicture: direct.profile_picture
          });
        }

        teamOverview = {
          type: 'direct_reports',
          title: 'HR Team Members',
          subtitle: 'Direct reports under HR Department Management',
          rows: directReportRows
        };

        // PIP / PDP Overview
        const hrPlans = await Plan.findAll({
          where: {
            [Op.or]: [
              { manager_id: currentUser.id },
              { recipient_id: { [Op.in]: allHrUserIds } }
            ]
          },
          include: [
            { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'department'] },
            { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        const activePips = [];
        const ongoingPdps = [];
        let completedPlansCount = 0;

        for (const p of hrPlans) {
          if (p.status === 'completed') {
            completedPlansCount++;
            continue;
          }

          if (p.type === 'PIP') {
            const deadline = calculatePipDeadline(p.createdAt, null, p.due_date);
            const nowMs = Date.now();
            const daysRemaining = Math.ceil((deadline.cutoffMs - nowMs) / (1000 * 60 * 60 * 24));
            activePips.push({
              id: p.id,
              title: p.title,
              description: p.description,
              recipientName: p.recipient?.name || 'Unknown',
              recipientEmail: p.recipient?.email || '',
              status: p.status,
              assignedDate: deadline.assignmentDateFormatted,
              dueDate: deadline.dueDateFormatted,
              isOpen: deadline.isOpen,
              daysRemaining: Math.max(0, daysRemaining),
              isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
            });
          } else if (p.type === 'PDP') {
            ongoingPdps.push({
              id: p.id,
              title: p.title,
              description: p.description,
              recipientName: p.recipient?.name || 'Unknown',
              recipientEmail: p.recipient?.email || '',
              quarter: p.quarter,
              year: p.year,
              status: p.status,
              isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
            });
          }
        }

        pipPdpOverview = {
          activePips,
          ongoingPdps,
          completedPlansCount
        };

        // Department Report Status (Amaya sees latest submitted reports across IT/Finance portfolios)
        const latestHrReports = await DepartmentReport.findAll({
          where: {
            quarter: activeCycle.quarter,
            year: activeCycle.year,
            is_latest: true
          },
          include: [
            { model: User, as: 'author', attributes: ['id', 'name', 'email', 'department'] },
            { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
          ],
          order: [['submitted_at', 'DESC']]
        });

        if (latestHrReports.length > 0) {
          departmentReportStatus = {
            reports: latestHrReports.map(r => ({
              id: r.id,
              department: r.department,
              quarter: r.quarter,
              year: r.year,
              revisionNumber: r.revision_number,
              submittedAt: r.submitted_at,
              authorName: r.author?.name || 'Department Manager',
              recipientName: r.recipient?.name || 'HR Recipient',
              recipientEmail: r.recipient?.email || ''
            }))
          };
        }
      } else {
        // Dinesh (IT) or Chamari (Finance)
        const deptTeamManagers = await User.findAll({
          where: {
            department: currentUser.department,
            role: 'team_manager'
          },
          attributes: ['id', 'name', 'email', 'department', 'team', 'quarter_batch', 'profile_picture']
        });

        const allDeptUsers = await User.findAll({
          where: { department: currentUser.department },
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch']
        });

        const totalDeptEmployees = allDeptUsers.length;
        const eligibleEmployeesCount = allDeptUsers.filter(u => u.quarter_batch === activeCycle.quarter).length;

        // Department reviews in active cycle
        const deptUserIds = allDeptUsers.map(u => u.id);
        const deptTasks = await Task.findAll({
          where: {
            assignee_id: { [Op.in]: deptUserIds },
            quarter: activeCycle.quarter,
            year: activeCycle.year
          }
        });
        reviewProgress = aggregateTasksWithGroupedDownward(deptTasks);

        summaryCards = [
          {
            id: 'team_managers',
            title: 'Team Managers',
            value: deptTeamManagers.length.toString(),
            subtitle: `${currentUser.department} Department Teams`,
            icon: 'user-group',
            highlight: 'gold'
          },
          {
            id: 'total_employees',
            title: 'Total Employees',
            value: totalDeptEmployees.toString(),
            subtitle: `${currentUser.department} Total Headcount`,
            icon: 'building',
            highlight: 'neutral'
          },
          {
            id: 'eligible_employees',
            title: 'Current-Cycle Eligible',
            value: eligibleEmployeesCount.toString(),
            subtitle: `Batch ${activeCycle.quarter} (${activeCycle.label})`,
            icon: 'check-circle',
            highlight: 'gold'
          },
          {
            id: 'review_completion',
            title: 'Review Completion',
            value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : 'No tasks',
            subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} reviews completed` : 'No assignments',
            icon: 'clipboard-check',
            highlight: 'gold'
          }
        ];

        // Team Overview table by Team Manager
        const teamRows = [];
        for (const tm of deptTeamManagers) {
          const teamMembers = allDeptUsers.filter(u => u.team === tm.team && u.role === 'employee');
          const teamMemberIds = [tm.id, ...teamMembers.map(m => m.id)];

          const teamTasks = await Task.findAll({
            where: {
              assignee_id: { [Op.in]: teamMemberIds },
              quarter: activeCycle.quarter,
              year: activeCycle.year
            }
          });
          const tProgress = aggregateTasksWithGroupedDownward(teamTasks);
          const eligibleInTeam = teamMembers.filter(m => m.quarter_batch === activeCycle.quarter).length +
            (tm.quarter_batch === activeCycle.quarter ? 1 : 0);

          teamRows.push({
            id: tm.id,
            teamName: tm.team || 'General Team',
            managerName: tm.name,
            managerEmail: tm.email,
            headcount: teamMembers.length + 1, // members + manager
            eligibleCount: eligibleInTeam,
            reviewCompletion: tProgress.total.hasAssignments ? `${tProgress.total.percentage}% (${tProgress.total.completed}/${tProgress.total.assigned})` : 'No assignments',
            completionRate: tProgress.total.percentage,
            hasAssignments: tProgress.total.hasAssignments
          });
        }

        teamOverview = {
          type: 'teams_breakdown',
          title: 'Teams',
          subtitle: `Review completion across ${currentUser.department} teams`,
          rows: teamRows
        };

        // PIP / PDP Overview for Department
        const deptPlans = await Plan.findAll({
          where: {
            recipient_id: { [Op.in]: deptUserIds }
          },
          include: [
            { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'department', 'team'] },
            { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        const activePips = [];
        const ongoingPdps = [];
        let completedPlansCount = 0;

        for (const p of deptPlans) {
          if (p.status === 'completed') {
            completedPlansCount++;
            continue;
          }

          if (p.type === 'PIP') {
            const deadline = calculatePipDeadline(p.createdAt, null, p.due_date);
            const nowMs = Date.now();
            const daysRemaining = Math.ceil((deadline.cutoffMs - nowMs) / (1000 * 60 * 60 * 24));
            activePips.push({
              id: p.id,
              title: p.title,
              description: p.description,
              recipientName: p.recipient?.name || 'Unknown',
              recipientEmail: p.recipient?.email || '',
              team: p.recipient?.team || '',
              status: p.status,
              assignedDate: deadline.assignmentDateFormatted,
              dueDate: deadline.dueDateFormatted,
              isOpen: deadline.isOpen,
              daysRemaining: Math.max(0, daysRemaining),
              isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
            });
          } else if (p.type === 'PDP') {
            ongoingPdps.push({
              id: p.id,
              title: p.title,
              description: p.description,
              recipientName: p.recipient?.name || 'Unknown',
              recipientEmail: p.recipient?.email || '',
              team: p.recipient?.team || '',
              quarter: p.quarter,
              year: p.year,
              status: p.status,
              isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
            });
          }
        }

        pipPdpOverview = {
          activePips,
          ongoingPdps,
          completedPlansCount
        };

        // Department Report Status for this Manager's department
        const latestDeptReport = await DepartmentReport.findOne({
          where: {
            department: currentUser.department,
            quarter: activeCycle.quarter,
            year: activeCycle.year,
            is_latest: true
          },
          include: [
            { model: User, as: 'author', attributes: ['id', 'name', 'email'] },
            { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
          ]
        });

        if (latestDeptReport) {
          departmentReportStatus = {
            id: latestDeptReport.id,
            department: latestDeptReport.department,
            quarter: latestDeptReport.quarter,
            year: latestDeptReport.year,
            revisionNumber: latestDeptReport.revision_number,
            submittedAt: latestDeptReport.submitted_at,
            recipientName: latestDeptReport.recipient?.name || 'HR Recipient',
            recipientEmail: latestDeptReport.recipient?.email || '',
            authorName: latestDeptReport.author?.name || currentUser.name,
            isSubmitted: true
          };
        } else {
          // Find designated HR recipient for this department
          const hrRecipient = await User.findOne({
            where: {
              report_portfolio: currentUser.department
            },
            attributes: ['id', 'name', 'email']
          });

          departmentReportStatus = {
            department: currentUser.department,
            quarter: activeCycle.quarter,
            year: activeCycle.year,
            revisionNumber: 0,
            submittedAt: null,
            recipientName: hrRecipient?.name || 'Assigned HR Specialist',
            recipientEmail: hrRecipient?.email || '',
            authorName: currentUser.name,
            isSubmitted: false
          };
        }
      }
    }

    // -------------------------------------------------------------
    // 2. TEAM MANAGERS (Sarah Fernando, Kasun, Malan, etc.)
    // -------------------------------------------------------------
    else if (currentUser.role === 'team_manager') {
      const directEmployees = await User.findAll({
        where: {
          manager_id: currentUser.id,
          role: 'employee'
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch', 'profile_picture']
      });

      const directIds = directEmployees.map(u => u.id);
      const allTeamIds = [currentUser.id, ...directIds];

      // Review progress for team
      const teamTasks = await Task.findAll({
        where: {
          assignee_id: { [Op.in]: allTeamIds },
          quarter: activeCycle.quarter,
          year: activeCycle.year
        }
      });
      reviewProgress = aggregateTasksWithGroupedDownward(teamTasks);

      // Active plans for direct reports
      const teamPlans = await Plan.findAll({
        where: {
          recipient_id: { [Op.in]: directIds }
        },
        include: [
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      const activePips = [];
      const ongoingPdps = [];
      let completedPlansCount = 0;

      for (const p of teamPlans) {
        if (p.status === 'completed') {
          completedPlansCount++;
          continue;
        }
        if (p.type === 'PIP') {
          const deadline = calculatePipDeadline(p.createdAt, null, p.due_date);
          const nowMs = Date.now();
          const daysRemaining = Math.ceil((deadline.cutoffMs - nowMs) / (1000 * 60 * 60 * 24));
          activePips.push({
            id: p.id,
            title: p.title,
            description: p.description,
            recipientName: p.recipient?.name || 'Unknown',
            recipientEmail: p.recipient?.email || '',
            status: p.status,
            assignedDate: deadline.assignmentDateFormatted,
            dueDate: deadline.dueDateFormatted,
            isOpen: deadline.isOpen,
            daysRemaining: Math.max(0, daysRemaining),
            isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
          });
        } else if (p.type === 'PDP') {
          ongoingPdps.push({
            id: p.id,
            title: p.title,
            description: p.description,
            recipientName: p.recipient?.name || 'Unknown',
            recipientEmail: p.recipient?.email || '',
            quarter: p.quarter,
            year: p.year,
            status: p.status,
            isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
          });
        }
      }

      pipPdpOverview = {
        activePips,
        ongoingPdps,
        completedPlansCount
      };

      const eligibleDirects = directEmployees.filter(u => u.quarter_batch === activeCycle.quarter).length;

      summaryCards = [
        {
          id: 'direct_reports',
          title: 'Direct Reports',
          value: directEmployees.length.toString(),
          subtitle: `${currentUser.team || 'Team'} Members`,
          icon: 'users',
          highlight: 'gold'
        },
        {
          id: 'eligible_employees',
          title: 'Current-Cycle Eligible',
          value: eligibleDirects.toString(),
          subtitle: `Batch ${activeCycle.quarter} (${activeCycle.label})`,
          icon: 'check-circle',
          highlight: 'gold'
        },
        {
          id: 'review_completion',
          title: 'Team Review Completion',
          value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : 'No tasks',
          subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} reviews completed` : 'No assignments',
          icon: 'clipboard-check',
          highlight: 'gold'
        },
        {
          id: 'active_plans',
          title: 'Active PIP / PDP Plans',
          value: (activePips.length + ongoingPdps.length).toString(),
          subtitle: `${activePips.length} PIPs • ${ongoingPdps.length} PDPs`,
          icon: 'chart-bar',
          highlight: 'neutral'
        }
      ];

      // Direct reports overview rows
      const directRows = [];
      for (const direct of directEmployees) {
        const dTasks = await Task.findAll({
          where: {
            assignee_id: direct.id,
            quarter: activeCycle.quarter,
            year: activeCycle.year
          }
        });
        const dProg = aggregateTasksWithGroupedDownward(dTasks);

        const dActivePlans = teamPlans.filter(p => p.recipient_id === direct.id && p.status !== 'completed');

        directRows.push({
          id: direct.id,
          name: direct.name,
          email: direct.email,
          roleTitle: direct.role === 'team_manager' ? 'Team Manager' : 'Engineer / Associate',
          quarterBatch: direct.quarter_batch,
          isEligible: direct.quarter_batch === activeCycle.quarter,
          reviewStatus: dProg.total.hasAssignments ? `${dProg.total.percentage}% (${dProg.total.completed}/${dProg.total.assigned})` : 'No assignments',
          activePlansCount: dActivePlans.length,
          profilePicture: direct.profile_picture
        });
      }

      teamOverview = {
        type: 'direct_reports',
        title: 'Team Members',
        subtitle: `Direct reports in ${currentUser.team || 'Team'}`,
        rows: directRows
      };
    }

    // -------------------------------------------------------------
    // 3. EMPLOYEES & HR SPECIALISTS (Ayesha, Ruwan, Nethmi, Engineers)
    // -------------------------------------------------------------
    else if (currentUser.role === 'employee') {
      // Personal reviews
      const myTasks = await Task.findAll({
        where: {
          assignee_id: currentUser.id,
          quarter: activeCycle.quarter,
          year: activeCycle.year
        }
      });
      reviewProgress = aggregateTasksWithGroupedDownward(myTasks);

      // Personal plans
      const myPlans = await Plan.findAll({
        where: {
          recipient_id: currentUser.id
        },
        order: [['createdAt', 'DESC']]
      });

      const activePips = [];
      const ongoingPdps = [];
      let completedPlansCount = 0;

      for (const p of myPlans) {
        if (p.status === 'completed') {
          completedPlansCount++;
          continue;
        }
        if (p.type === 'PIP') {
          const deadline = calculatePipDeadline(p.createdAt, null, p.due_date);
          const nowMs = Date.now();
          const daysRemaining = Math.ceil((deadline.cutoffMs - nowMs) / (1000 * 60 * 60 * 24));
          activePips.push({
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            assignedDate: deadline.assignmentDateFormatted,
            dueDate: deadline.dueDateFormatted,
            isOpen: deadline.isOpen,
            daysRemaining: Math.max(0, daysRemaining),
            isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
          });
        } else if (p.type === 'PDP') {
          ongoingPdps.push({
            id: p.id,
            title: p.title,
            description: p.description,
            quarter: p.quarter,
            year: p.year,
            status: p.status,
            isCrossCycle: p.quarter !== activeCycle.quarter || p.year !== activeCycle.year
          });
        }
      }

      pipPdpOverview = {
        activePips,
        ongoingPdps,
        completedPlansCount
      };

      const isEligible = currentUser.quarter_batch === activeCycle.quarter;

      if (currentUser.report_portfolio) {
        // HR Portfolio Specialist (Ayesha - IT, Ruwan - Finance)
        const portfolioReport = await DepartmentReport.findOne({
          where: {
            department: currentUser.report_portfolio,
            quarter: activeCycle.quarter,
            year: activeCycle.year,
            is_latest: true
          },
          include: [
            { model: User, as: 'author', attributes: ['id', 'name', 'email'] }
          ]
        });

        summaryCards = [
          {
            id: 'portfolio',
            title: 'Assigned HR Portfolio',
            value: `${currentUser.report_portfolio} Department`,
            subtitle: 'Department Report Oversight',
            icon: 'briefcase',
            highlight: 'gold'
          },
          {
            id: 'report_status',
            title: 'Portfolio Report Status',
            value: portfolioReport ? `Revision #${portfolioReport.revision_number}` : 'Awaiting Submission',
            subtitle: portfolioReport ? `Submitted on ${new Date(portfolioReport.submitted_at).toLocaleDateString()}` : `Active Cycle (${activeCycle.label})`,
            icon: 'document-text',
            highlight: portfolioReport ? 'gold' : 'neutral'
          },
          {
            id: 'cycle_eligibility',
            title: 'Cycle Eligibility',
            value: isEligible ? 'Active in Cycle' : 'Scheduled',
            subtitle: `Assigned Batch ${currentUser.quarter_batch || 'None'}`,
            icon: 'check-circle',
            highlight: isEligible ? 'gold' : 'neutral'
          },
          {
            id: 'personal_reviews',
            title: 'Personal Review Tasks',
            value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : 'No tasks',
            subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} completed` : 'No assignments',
            icon: 'clipboard-check',
            highlight: 'gold'
          }
        ];

        // Department report status card
        if (portfolioReport) {
          departmentReportStatus = {
            id: portfolioReport.id,
            department: portfolioReport.department,
            quarter: portfolioReport.quarter,
            year: portfolioReport.year,
            revisionNumber: portfolioReport.revision_number,
            submittedAt: portfolioReport.submitted_at,
            authorName: portfolioReport.author?.name || 'Department Manager',
            authorEmail: portfolioReport.author?.email || '',
            recipientName: currentUser.name,
            isSubmitted: true
          };
        } else {
          departmentReportStatus = {
            department: currentUser.report_portfolio,
            quarter: activeCycle.quarter,
            year: activeCycle.year,
            revisionNumber: 0,
            submittedAt: null,
            authorName: `${currentUser.report_portfolio} Department Manager`,
            recipientName: currentUser.name,
            isSubmitted: false
          };
        }
      } else {
        // Regular Employee or HR Associate without portfolio (Nethmi)
        summaryCards = [
          {
            id: 'personal_reviews',
            title: 'Review Tasks',
            value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : '0 assigned',
            subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} completed` : 'No active assignments',
            icon: 'clipboard-check',
            highlight: 'gold'
          },
          {
            id: 'active_pdp',
            title: 'Development Plans (PDP)',
            value: ongoingPdps.length > 0 ? ongoingPdps.length.toString() : 'None',
            subtitle: ongoingPdps.length > 0 ? 'Active career development plan' : 'No ongoing PDP',
            icon: 'trending-up',
            highlight: ongoingPdps.length > 0 ? 'gold' : 'neutral'
          },
          {
            id: 'active_pip',
            title: 'Improvement Plans (PIP)',
            value: activePips.length > 0 ? activePips.length.toString() : 'None',
            subtitle: activePips.length > 0 ? 'Active improvement plan deliverable' : 'No active PIP assigned',
            icon: 'shield-check',
            highlight: activePips.length > 0 ? 'gold' : 'neutral'
          },
          {
            id: 'cycle_status',
            title: 'Current Cycle Status',
            value: isEligible ? `Eligible (${currentUser.quarter_batch})` : `Batch ${currentUser.quarter_batch || 'None'}`,
            subtitle: isEligible ? 'Submission window open' : `Active Cycle is ${activeCycle.label}`,
            icon: 'calendar',
            highlight: isEligible ? 'gold' : 'neutral'
          }
        ];
      }
    }

    // -------------------------------------------------------------
    // 4. COMPANY MANAGER (Anura Senaratne)
    // -------------------------------------------------------------
    else if (currentUser.role === 'company_manager') {
      const allDepts = ['IT', 'Finance', 'Human Resources'];
      const allUsers = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch']
      });

      const totalEligible = allUsers.filter(u => u.quarter_batch === activeCycle.quarter).length;

      // Org-wide reviews
      const allTasks = await Task.findAll({
        where: {
          quarter: activeCycle.quarter,
          year: activeCycle.year
        }
      });
      reviewProgress = aggregateTasksWithGroupedDownward(allTasks);

      summaryCards = [
        {
          id: 'total_departments',
          title: 'Total Departments',
          value: allDepts.length.toString(),
          subtitle: 'IT, Finance, HR',
          icon: 'building',
          highlight: 'gold'
        },
        {
          id: 'department_heads',
          title: 'Department Heads',
          value: '3',
          subtitle: 'Dinesh, Chamari, Amaya',
          icon: 'user-group',
          highlight: 'gold'
        },
        {
          id: 'eligible_employees',
          title: 'Organization Eligible',
          value: totalEligible.toString(),
          subtitle: `Batch ${activeCycle.quarter} (${activeCycle.label})`,
          icon: 'check-circle',
          highlight: 'gold'
        },
        {
          id: 'org_completion',
          title: 'Company Review Progress',
          value: reviewProgress.total.hasAssignments ? `${reviewProgress.total.percentage}%` : 'No tasks',
          subtitle: reviewProgress.total.hasAssignments ? `${reviewProgress.total.completed}/${reviewProgress.total.assigned} reviews completed` : 'No assignments',
          icon: 'clipboard-check',
          highlight: 'gold'
        }
      ];

      // Department Heads Overview
      const deptHeads = await User.findAll({
        where: {
          [Op.or]: [
            { role: 'department_manager' },
            { role: 'hr_manager' }
          ]
        },
        attributes: ['id', 'name', 'email', 'department', 'quarter_batch', 'profile_picture']
      });

      const deptRows = [];
      for (const head of deptHeads) {
        const dMembers = allUsers.filter(u => u.department === head.department);
        const dMemberIds = dMembers.map(m => m.id);

        const dTasks = await Task.findAll({
          where: {
            assignee_id: { [Op.in]: dMemberIds },
            quarter: activeCycle.quarter,
            year: activeCycle.year
          }
        });
        const dProg = aggregateTasksWithGroupedDownward(dTasks);
        const dEligible = dMembers.filter(m => m.quarter_batch === activeCycle.quarter).length;

        deptRows.push({
          id: head.id,
          department: head.department,
          managerName: head.name,
          managerEmail: head.email,
          headcount: dMembers.length,
          eligibleCount: dEligible,
          reviewCompletion: dProg.total.hasAssignments ? `${dProg.total.percentage}% (${dProg.total.completed}/${dProg.total.assigned})` : 'No assignments',
          completionRate: dProg.total.percentage,
          hasAssignments: dProg.total.hasAssignments
        });
      }

      teamOverview = {
        type: 'departments_overview',
        title: 'Departments',
        subtitle: 'Headcount, cycle eligibility, and review progress by department',
        rows: deptRows
      };

      // Org-wide plan counts
      const totalPips = await Plan.count({ where: { type: 'PIP', status: { [Op.in]: ['pending', 'evidence_submitted'] } } });
      const totalPdps = await Plan.count({ where: { type: 'PDP', status: { [Op.in]: ['pending', 'evidence_submitted'] } } });
      const totalCompleted = await Plan.count({ where: { status: 'completed' } });

      pipPdpOverview = {
        activePips: [],
        ongoingPdps: [],
        completedPlansCount: totalCompleted,
        summaryOnly: true,
        totalPips,
        totalPdps
      };
    }

    // -------------------------------------------------------------
    // 5. NEEDS ATTENTION (Universal calculation for current user)
    // -------------------------------------------------------------
    // 5.1 Pending personal review tasks
    const pendingTasks = await Task.findAll({
      where: {
        assignee_id: currentUser.id,
        status: 'pending'
      },
      include: [
        { model: User, as: 'reviewee', attributes: ['id', 'name', 'email', 'department'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: 5
    });

    for (const task of pendingTasks) {
      const typeLabel = task.feedback_type || (task.type ? task.type.replace('_review', '') : 'review');
      const subjectName = task.reviewee ? task.reviewee.name : (task.group_subject_ids ? 'Assigned Team Members' : 'Self');

      needsAttention.push({
        id: `task-${task.id}`,
        type: 'pending_review',
        priority: 'high',
        title: `Pending ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Review`,
        description: `Evaluation for ${subjectName} (${task.quarter} ${task.year}) is awaiting your submission.`,
        actionLabel: 'Complete Review',
        actionUrl: `/review-form/${task.id}`,
        dueDate: `${task.quarter} ${task.year}`
      });
    }

    // 5.2 Evidence submitted awaiting manager feedback
    if (['team_manager', 'department_manager', 'hr_manager'].includes(currentUser.role)) {
      // Find candidate plan IDs
      let planWhere = { status: 'evidence_submitted' };
      if (currentUser.role === 'team_manager' || isAmaya) {
        planWhere.manager_id = currentUser.id;
      } else if (currentUser.role === 'department_manager') {
        const deptUsers = await User.findAll({
          where: { department: currentUser.department },
          attributes: ['id']
        });
        const deptUserIds = deptUsers.map(u => u.id);
        planWhere[Op.or] = [
          { manager_id: currentUser.id },
          { recipient_id: { [Op.in]: deptUserIds } }
        ];
      }

      const candidatePlans = await Plan.findAll({
        where: planWhere,
        include: [
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'department'] },
          {
            model: Evidence,
            as: 'evidences',
            include: [
              { model: EvidenceFeedback, as: 'feedbacks' }
            ]
          }
        ],
        order: [['updatedAt', 'DESC']],
        limit: 5
      });

      for (const p of candidatePlans) {
        if (p.evidences && p.evidences.length > 0) {
          const ev = p.evidences[p.evidences.length - 1]; // latest evidence
          const hasFeedback = ev.feedbacks && ev.feedbacks.some(f => f.manager_id === currentUser.id);
          if (!hasFeedback) {
            needsAttention.push({
              id: `evidence-${ev.id}`,
              type: 'evidence_feedback',
              priority: 'high',
              title: `Evidence Awaiting Feedback: ${p.title}`,
              description: `Submitted by ${p.recipient?.name || 'Employee'} for ${p.type}. Review deliverable and record feedback.`,
              actionLabel: 'Review Evidence',
              actionUrl: '/assigned-plans',
              dueDate: 'Action Required'
            });
          }
        }
      }
    }

    // 5.3 Active PIP deadlines approaching (within 30 days)
    if (pipPdpOverview && pipPdpOverview.activePips) {
      for (const pip of pipPdpOverview.activePips) {
        if (pip.daysRemaining <= 30 && pip.isOpen) {
          needsAttention.push({
            id: `pip-deadline-${pip.id}`,
            type: 'approaching_deadline',
            priority: pip.daysRemaining <= 7 ? 'urgent' : 'medium',
            title: `Approaching PIP Deadline: ${pip.title}`,
            description: `${pip.recipientName ? `${pip.recipientName} • ` : ''}${pip.daysRemaining} days remaining until final submission cutoff (${pip.dueDate}).`,
            actionLabel: currentUser.role === 'employee' ? 'Submit Evidence' : 'View Plan',
            actionUrl: currentUser.role === 'employee' ? '/my-tasks' : '/assigned-plans',
            dueDate: pip.dueDate
          });
        }
      }
    }

    return res.json({
      activeCycle,
      cycleStatus,
      userContext: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        department: currentUser.department,
        team: currentUser.team,
        reportPortfolio: currentUser.report_portfolio,
        quarterBatch: currentUser.quarter_batch
      },
      summaryCards,
      reviewProgress,
      teamOverview,
      pipPdpOverview,
      departmentReportStatus,
      needsAttention
    });
  } catch (err) {
    console.error('Error fetching dashboard analytics:', err);
    return res.status(500).json({ message: 'Failed to load dashboard data', error: err.message });
  }
});

module.exports = router;
