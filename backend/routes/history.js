const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Review = require('../models/Review');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Evidence = require('../models/Evidence');
const EvidenceFeedback = require('../models/EvidenceFeedback');
const DepartmentReport = require('../models/DepartmentReport');
const User = require('../models/User');
const auth = require('../middleware/auth');

const { calculatePipDeadline } = require('../utils/pipDeadline');

/**
 * Determine active quarter and year using Asia/Colombo timezone.
 */
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

/**
 * Helper to validate and normalize scope parameter.
 * Default is 'personal'.
 */
function normalizeScope(scopeQuery) {
  if (!scopeQuery || scopeQuery === 'personal') {
    return 'personal';
  }
  if (scopeQuery === 'all' || scopeQuery === 'authorized') {
    return 'all';
  }
  return null;
}

/**
 * Determine if a user has permission to view the broader 'all' authorized history scope.
 * Access is granted to:
 * - Authorized manager roles (team_manager, department_manager, company_manager, hr_manager)
 * - HR employees with a designated report_portfolio (e.g. Ayesha, Ruwan)
 * Ordinary employees without a report portfolio (e.g. Dinesh, Nethmi) are restricted to 'personal'.
 */
function canAccessAllAuthorizedRecords(user) {
  if (!user) return false;
  const isManager = ['team_manager', 'department_manager', 'company_manager', 'hr_manager'].includes(user.role);
  if (isManager) return true;
  const isHrPortfolio = ['Human Resources', 'HR'].includes(user.department) && user.role === 'employee' && Boolean(user.report_portfolio);
  if (isHrPortfolio) return true;
  return false;
}

/**
 * Helper to fetch raw authorized history records for a given user.
 * Supports scope: 'personal' (default) vs 'all' (all authorized records).
 * Strictly non-mutating / read-only query.
 */
async function fetchUserHistoryRecords(user, scope = 'personal') {
  const isManager = ['team_manager', 'department_manager', 'company_manager', 'hr_manager'].includes(user.role);
  const isDeptManager = user.role === 'department_manager';
  const isHrPortfolio = ['Human Resources', 'HR'].includes(user.department) && user.role === 'employee' && Boolean(user.report_portfolio);

  const records = [];
  const isPersonalOnly = scope === 'personal';

  // -------------------------------------------------------------
  // 1. REVIEWS
  // -------------------------------------------------------------

  // A. Authored Reviews (Self reviews & peer/upward/downward reviews submitted by this user)
  const authoredReviews = await Review.findAll({
    where: { reviewer_id: user.id },
    include: [
      { model: Task, attributes: ['id', 'type', 'feedback_type', 'quarter', 'year', 'status'] },
      { model: User, as: 'reviewer', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
      { model: User, as: 'reviewee', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
    ],
    order: [['submitted_at', 'DESC']]
  });

  for (const r of authoredReviews) {
    const isSelf = r.reviewer_id === r.reviewee_id;
    const taskType = r.Task?.type || (isSelf ? 'self_review' : 'peer_review');
    let title = 'Review Submission';
    if (taskType === 'self_review') {
      title = 'Self Assessment';
    } else if (taskType === 'peer_review') {
      title = `Peer Review: ${r.reviewee?.name || 'Peer'}`;
    } else if (taskType === 'upward_review') {
      title = `Upward Review: ${r.reviewee?.name || 'Manager'}`;
    } else if (taskType === 'downward_review') {
      title = `Downward Review: ${r.reviewee?.name || 'Direct Report'}`;
    }

    records.push({
      id: `review_${r.id}`,
      entity_type: 'review',
      entity_id: r.id,
      task_id: r.task_id,
      category: 'Review',
      record_type: taskType,
      title,
      department: r.reviewee?.department || user.department,
      quarter: r.Task?.quarter || 'Q3',
      year: r.Task?.year || (r.submitted_at ? new Date(r.submitted_at).getFullYear() : 2026),
      status: 'completed',
      submitted_at: r.submitted_at || r.createdAt,
      due_date: null,
      author: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name, role: r.reviewer.role } : null,
      subject: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, role: r.reviewee.role } : null,
      recipient: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, role: r.reviewee.role } : null,
      is_subordinate_review: false,
    });
  }

  // B. Subordinate Reviews (Manager view of direct reports' completed reviews) - Excluded in Personal scope
  if (isManager && !isPersonalOnly) {
    const directReports = await User.findAll({
      where: { manager_id: user.id },
      attributes: ['id']
    });
    const directReportIds = directReports.map(d => d.id);

    if (directReportIds.length > 0) {
      const subordinateReviews = await Review.findAll({
        where: {
          reviewee_id: directReportIds,
          reviewer_id: { [Op.ne]: user.id } // Avoid duplicating authored downward reviews
        },
        include: [
          { model: Task, attributes: ['id', 'type', 'feedback_type', 'quarter', 'year', 'status'] },
          { model: User, as: 'reviewer', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
          { model: User, as: 'reviewee', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        ],
        order: [['submitted_at', 'DESC']]
      });

      for (const r of subordinateReviews) {
        const isSelf = r.reviewer_id === r.reviewee_id;
        const taskType = r.Task?.type || (isSelf ? 'self_review' : 'peer_review');
        let title;
        if (isSelf) {
          title = `Self Assessment: ${r.reviewee?.name}`;
        } else {
          title = `Peer Review of ${r.reviewee?.name} (by ${r.reviewer?.name || 'Peer'})`;
        }

        records.push({
          id: `sub_review_${r.id}`,
          entity_type: 'review',
          entity_id: r.id,
          task_id: r.task_id,
          category: 'Review',
          record_type: taskType,
          title,
          department: r.reviewee?.department || user.department,
          quarter: r.Task?.quarter || 'Q3',
          year: r.Task?.year || (r.submitted_at ? new Date(r.submitted_at).getFullYear() : 2026),
          status: 'completed',
          submitted_at: r.submitted_at || r.createdAt,
          due_date: null,
          author: r.reviewer ? { id: r.reviewer.id, name: r.reviewer.name, role: r.reviewer.role } : null,
          subject: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, role: r.reviewee.role } : null,
          recipient: r.reviewee ? { id: r.reviewee.id, name: r.reviewee.name, role: r.reviewee.role } : null,
          is_subordinate_review: true,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 2. PLANS (PIP & PDP)
  // -------------------------------------------------------------

  // A. Plans assigned to this user (Recipient)
  const recipientPlans = await Plan.findAll({
    where: { recipient_id: user.id },
    include: [
      { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
      { model: Evidence, as: 'evidences', attributes: ['id'] },
    ],
    order: [['createdAt', 'DESC']]
  });

  for (const p of recipientPlans) {
    const isPip = p.type === 'PIP';
    const pipDeadline = isPip ? calculatePipDeadline(p.createdAt, null, p.due_date) : null;
    const isExpired = isPip && p.status !== 'completed' && pipDeadline.isPast;

    records.push({
      id: `plan_${p.id}`,
      entity_type: 'plan',
      entity_id: p.id,
      task_id: null,
      category: 'Plan',
      record_type: p.type === 'PIP' ? 'pip' : 'pdp',
      title: `${p.type}: ${p.title}`,
      department: user.department,
      quarter: p.quarter,
      year: p.year,
      status: p.status,
      is_expired: isExpired,
      submitted_at: p.createdAt,
      due_date: p.due_date,
      author: p.manager ? { id: p.manager.id, name: p.manager.name, role: p.manager.role } : null,
      subject: p.recipient ? { id: p.recipient.id, name: p.recipient.name, role: p.recipient.role } : null,
      recipient: p.recipient ? { id: p.recipient.id, name: p.recipient.name, role: p.recipient.role } : null,
      evidence_count: p.evidences ? p.evidences.length : 0,
      is_assigned_by_me: false,
    });
  }

  // B. Plans assigned by this user (Manager) - Excluded in Personal scope
  if (isManager && !isPersonalOnly) {
    const assignedPlans = await Plan.findAll({
      where: {
        manager_id: user.id,
        recipient_id: { [Op.ne]: user.id } // Avoid duplicate if self-plan exists
      },
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        { model: Evidence, as: 'evidences', attributes: ['id'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    for (const p of assignedPlans) {
      const isPip = p.type === 'PIP';
      const pipDeadline = isPip ? calculatePipDeadline(p.createdAt, null, p.due_date) : null;
      const isExpired = isPip && p.status !== 'completed' && pipDeadline.isPast;

      records.push({
        id: `plan_${p.id}`,
        entity_type: 'plan',
        entity_id: p.id,
        task_id: null,
        category: 'Plan',
        record_type: p.type === 'PIP' ? 'pip' : 'pdp',
        title: `${p.type} (${p.recipient?.name || 'Direct Report'}): ${p.title}`,
        department: p.recipient?.department || user.department,
        quarter: p.quarter,
        year: p.year,
        status: p.status,
        is_expired: isExpired,
        submitted_at: p.createdAt,
        due_date: p.due_date,
        author: p.manager ? { id: p.manager.id, name: p.manager.name, role: p.manager.role } : null,
        subject: p.recipient ? { id: p.recipient.id, name: p.recipient.name, role: p.recipient.role } : null,
        recipient: p.recipient ? { id: p.recipient.id, name: p.recipient.name, role: p.recipient.role } : null,
        evidence_count: p.evidences ? p.evidences.length : 0,
        is_assigned_by_me: true,
      });
    }
  }

  // -------------------------------------------------------------
  // 3. DEPARTMENT SUMMARY REPORTS - Excluded in Personal scope
  // -------------------------------------------------------------
  if (!isPersonalOnly) {
    // A. Submitted Department Reports (Department Managers)
    if (isDeptManager) {
      const deptReports = await DepartmentReport.findAll({
        where: { author_id: user.id },
        include: [
          { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role', 'department'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department'] },
        ],
        order: [['submitted_at', 'DESC'], ['revision_number', 'DESC']]
      });

      for (const rep of deptReports) {
        records.push({
          id: `report_${rep.id}`,
          entity_type: 'report',
          entity_id: rep.id,
          task_id: null,
          category: 'Department Report',
          record_type: 'department_report',
          title: `${rep.title} (Rev ${rep.revision_number})`,
          department: rep.department,
          quarter: rep.quarter,
          year: rep.year,
          status: 'submitted',
          submitted_at: rep.submitted_at || rep.createdAt,
          due_date: null,
          author: rep.author ? { id: rep.author.id, name: rep.author.name, role: rep.author.role } : null,
          subject: null,
          recipient: rep.recipient ? { id: rep.recipient.id, name: rep.recipient.name, role: rep.recipient.role } : null,
          revision_number: rep.revision_number,
          is_latest: rep.is_latest,
          original_filename: rep.original_filename,
          file_size: rep.file_size,
        });
      }
    }

    // B. Received Department Reports (Designated HR Portfolio Recipient)
    if (isHrPortfolio) {
      const receivedReports = await DepartmentReport.findAll({
        where: { recipient_id: user.id },
        include: [
          { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role', 'department'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department'] },
        ],
        order: [['submitted_at', 'DESC'], ['revision_number', 'DESC']]
      });

      for (const rep of receivedReports) {
        records.push({
          id: `report_${rep.id}`,
          entity_type: 'report',
          entity_id: rep.id,
          task_id: null,
          category: 'Department Report',
          record_type: 'department_report',
          title: `${rep.title} (Rev ${rep.revision_number})`,
          department: rep.department,
          quarter: rep.quarter,
          year: rep.year,
          status: 'received',
          submitted_at: rep.submitted_at || rep.createdAt,
          due_date: null,
          author: rep.author ? { id: rep.author.id, name: rep.author.name, role: rep.author.role } : null,
          subject: null,
          recipient: rep.recipient ? { id: rep.recipient.id, name: rep.recipient.name, role: rep.recipient.role } : null,
          revision_number: rep.revision_number,
          is_latest: rep.is_latest,
          original_filename: rep.original_filename,
          file_size: rep.file_size,
        });
      }
    }
  }

  // Sort overall records with a globally stable composite tie-breaker
  records.sort((a, b) => {
    const timeA = new Date(a.submitted_at || 0).getTime();
    const timeB = new Date(b.submitted_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    // Tie-breaker 1: Entity Type
    const typeCompare = (a.entity_type || '').localeCompare(b.entity_type || '');
    if (typeCompare !== 0) return typeCompare;

    // Tie-breaker 2: Numerical Entity ID descending
    const numIdA = Number(a.entity_id) || 0;
    const numIdB = Number(b.entity_id) || 0;
    if (numIdB !== numIdA) return numIdB - numIdA;

    // Tie-breaker 3: String ID
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return records;
}

/**
 * GET /api/history/filters
 * Returns available filter options dynamically discovered from user's authorized records
 * Scoped by 'scope' parameter ('personal' default vs 'all')
 */
router.get('/filters', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const scope = normalizeScope(req.query.scope);
    if (!scope) {
      return res.status(400).json({ message: 'Invalid scope parameter. Supported values: personal, all' });
    }

    if (scope === 'all' && !canAccessAllAuthorizedRecords(user)) {
      return res.status(403).json({
        message: 'Access denied: All Authorized Records scope is restricted to authorized managers and designated HR portfolio holders.'
      });
    }

    const { quarter: activeQuarter, year: activeYear } = getActiveQuarterAndYear();
    const scopedRecords = await fetchUserHistoryRecords(user, scope);

    // Extract distinct years from accessible records in this scope
    const yearSet = new Set(scopedRecords.map(r => r.year).filter(y => y && !isNaN(y)));
    yearSet.add(activeYear);
    const years = Array.from(yearSet).sort((a, b) => b - a);

    // Operational Quarters (Strictly Q1, Q2, Q3)
    const quarters = ['Q1', 'Q2', 'Q3'];

    // Distinct record types accessible to user in this scope
    const typeSet = new Set(scopedRecords.map(r => r.record_type).filter(Boolean));
    const types = Array.from(typeSet);

    // Distinct statuses in this scope
    const statusSet = new Set(scopedRecords.map(r => r.status).filter(Boolean));
    const statuses = Array.from(statusSet);

    res.json({
      scope,
      activeCycle: { quarter: activeQuarter, year: activeYear },
      years,
      quarters,
      types,
      statuses,
      totalRecordsCount: scopedRecords.length
    });
  } catch (err) {
    console.error('Error fetching history filters:', err);
    res.status(500).json({ message: 'Server error retrieving history filters' });
  }
});

/**
 * GET /api/history
 * Query historical records with scope ('personal' default vs 'all'), year, quarter, type, status, search, and pagination
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const {
      scope: scopeQuery,
      year,
      quarter,
      type,
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const scope = normalizeScope(scopeQuery);
    if (!scope) {
      return res.status(400).json({ message: 'Invalid scope parameter. Supported values: personal, all' });
    }

    if (scope === 'all' && !canAccessAllAuthorizedRecords(user)) {
      return res.status(403).json({
        message: 'Access denied: All Authorized Records scope is restricted to authorized managers and designated HR portfolio holders.'
      });
    }

    const scopedRecords = await fetchUserHistoryRecords(user, scope);

    // Apply Filters
    let filtered = scopedRecords;

    if (year && year !== 'all') {
      const yearNum = parseInt(year, 10);
      filtered = filtered.filter(r => r.year === yearNum);
    }

    if (quarter && quarter !== 'all') {
      if (!['Q1', 'Q2', 'Q3'].includes(quarter)) {
        return res.status(400).json({ message: 'Invalid quarter filter. Operational quarters are Q1, Q2, and Q3.' });
      }
      filtered = filtered.filter(r => r.quarter === quarter);
    }

    if (type && type !== 'all') {
      if (type === 'review') {
        filtered = filtered.filter(r => ['self_review', 'peer_review', 'upward_review', 'downward_review'].includes(r.record_type));
      } else if (type === 'plan') {
        filtered = filtered.filter(r => ['pip', 'pdp'].includes(r.record_type));
      } else if (type === 'report') {
        filtered = filtered.filter(r => r.record_type === 'department_report');
      } else {
        filtered = filtered.filter(r => r.record_type === type);
      }
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.author?.name && r.author.name.toLowerCase().includes(q)) ||
        (r.subject?.name && r.subject.name.toLowerCase().includes(q)) ||
        (r.recipient?.name && r.recipient.name.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q))
      );
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRecords = filtered.slice(startIndex, startIndex + limitNum);

    const { quarter: activeQuarter, year: activeYear } = getActiveQuarterAndYear();

    res.json({
      scope,
      activeCycle: { quarter: activeQuarter, year: activeYear },
      records: paginatedRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (err) {
    console.error('Error retrieving historical records:', err);
    res.status(500).json({ message: 'Server error retrieving historical records' });
  }
});

/**
 * GET /api/history/review/:id
 * Authorized inspection of a specific historical review
 */
router.get('/review/:id', auth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (!reviewId || isNaN(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findByPk(reviewId, {
      include: [
        { model: Task, attributes: ['id', 'type', 'feedback_type', 'quarter', 'year', 'status', 'createdAt'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        { model: User, as: 'reviewee', attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'manager_id'] },
      ]
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const isAuthor = review.reviewer_id === req.user.id;
    const isDirectManager = review.reviewee?.manager_id === req.user.id;
    const isSelfReviewee = review.reviewer_id === review.reviewee_id && review.reviewee_id === req.user.id;

    // Strict privacy: Only author, self-reviewee, or direct manager of reviewee may view
    if (!isAuthor && !isDirectManager && !isSelfReviewee) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this review record' });
    }

    let parsedContent = {};
    if (review.content) {
      if (typeof review.content === 'string') {
        try { parsedContent = JSON.parse(review.content); } catch (_) { parsedContent = { raw: review.content }; }
      } else {
        parsedContent = review.content;
      }
    }

    res.json({
      id: review.id,
      task_id: review.task_id,
      type: review.Task?.type || 'review',
      quarter: review.Task?.quarter || 'Q3',
      year: review.Task?.year || 2026,
      submitted_at: review.submitted_at || review.createdAt,
      reviewer: review.reviewer ? { id: review.reviewer.id, name: review.reviewer.name, role: review.reviewer.role, team: review.reviewer.team } : null,
      reviewee: review.reviewee ? { id: review.reviewee.id, name: review.reviewee.name, role: review.reviewee.role, team: review.reviewee.team } : null,
      content: parsedContent
    });
  } catch (err) {
    console.error('Error fetching review detail:', err);
    res.status(500).json({ message: 'Server error retrieving review detail' });
  }
});

module.exports = router;
