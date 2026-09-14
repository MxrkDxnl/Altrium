const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const sequelize = require('../config/database');
const User = require('../models/User');
const Notification = require('../models/Notification');
const DepartmentReport = require('../models/DepartmentReport');
const { handleReportUpload, REPORT_STORAGE_DIR } = require('../middleware/reportUpload');

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

function computePayloadHash(data) {
  const canonicalString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * GET /api/reports/recipient-preview
 * Previews the auto-resolved HR recipient and active cycle for the submitting department manager
 */
router.get('/recipient-preview', auth, async (req, res) => {
  try {
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (manager.role !== 'department_manager') {
      return res.status(403).json({ message: 'Only Department Managers can submit or preview department reports.' });
    }

    if (!manager.department || !['IT', 'Finance'].includes(manager.department)) {
      return res.status(403).json({ message: 'Only IT and Finance Department Managers can submit department reports.' });
    }

    const { quarter, year } = getActiveQuarterAndYear();

    // Server-side recipient resolution: Unique HR employee with matching report_portfolio
    const hrRecipients = await User.findAll({
      where: {
        role: 'employee',
        department: ['Human Resources', 'HR'],
        report_portfolio: manager.department,
      },
      attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio', 'profile_picture'],
    });

    if (hrRecipients.length === 0) {
      return res.status(422).json({
        message: `Configuration error: No designated HR recipient found with report portfolio "${manager.department}".`
      });
    }

    if (hrRecipients.length > 1) {
      return res.status(422).json({
        message: `Configuration error: Multiple HR employees configured with report portfolio "${manager.department}". A unique recipient is required.`
      });
    }

    const recipient = hrRecipients[0];

    // Check if initial report already exists for active cycle
    const existingReport = await DepartmentReport.findOne({
      where: {
        department: manager.department,
        quarter,
        year,
        parent_report_id: null,
      },
      include: [
        { model: DepartmentReport, as: 'revisions', attributes: ['id', 'revision_number', 'submitted_at', 'title'] }
      ],
      order: [['submitted_at', 'DESC']],
    });

    res.json({
      department: manager.department,
      quarter,
      year,
      recipient,
      existingReport: existingReport ? {
        id: existingReport.id,
        title: existingReport.title,
        revision_number: existingReport.revision_number,
        submitted_at: existingReport.submitted_at,
        revisionsCount: (existingReport.revisions || []).length,
      } : null,
    });
  } catch (err) {
    console.error('Error fetching recipient preview:', err);
    res.status(500).json({ message: 'Server error retrieving recipient preview' });
  }
});

/**
 * POST /api/reports
 * Submits a new department summary report or a revision
 */
router.post('/', auth, handleReportUpload, async (req, res) => {
  const uploadedFile = req.file;

  const cleanupUploadedFile = () => {
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try { fs.unlinkSync(uploadedFile.path); } catch (_) {}
    }
  };

  try {
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      cleanupUploadedFile();
      return res.status(401).json({ message: 'User not found' });
    }

    if (manager.role !== 'department_manager' || !['IT', 'Finance'].includes(manager.department)) {
      cleanupUploadedFile();
      return res.status(403).json({ message: 'Only IT and Finance Department Managers can submit department summary reports.' });
    }

    const { quarter: activeQuarter, year: activeYear } = getActiveQuarterAndYear();
    const {
      title,
      reviews_summary,
      pip_summary,
      pdp_summary,
      submission_key,
      parent_report_id,
      quarter,
      year,
    } = req.body;

    // Validate operational cycle
    const reqYear = year ? parseInt(year, 10) : activeYear;
    if ((quarter && quarter !== activeQuarter) || (year && reqYear !== activeYear)) {
      cleanupUploadedFile();
      return res.status(400).json({
        message: `Department reports can only be submitted for the active operational cycle (${activeQuarter} ${activeYear}).`
      });
    }

    // Resolve HR Recipient
    const hrRecipients = await User.findAll({
      where: {
        role: 'employee',
        department: ['Human Resources', 'HR'],
        report_portfolio: manager.department,
      },
    });

    if (hrRecipients.length === 0) {
      cleanupUploadedFile();
      return res.status(422).json({
        message: `Configuration error: No designated HR recipient found with report portfolio "${manager.department}".`
      });
    }

    if (hrRecipients.length > 1) {
      cleanupUploadedFile();
      return res.status(422).json({
        message: `Configuration error: Multiple HR employees configured with report portfolio "${manager.department}".`
      });
    }

    const recipient = hrRecipients[0];

    // Field-level validations
    const errors = {};
    const cleanTitle = title && typeof title === 'string' ? title.trim() : '';
    const cleanReviewsSummary = reviews_summary && typeof reviews_summary === 'string' ? reviews_summary.trim() : '';
    const cleanPipSummary = pip_summary && typeof pip_summary === 'string' ? pip_summary.trim() : '';
    const cleanPdpSummary = pdp_summary && typeof pdp_summary === 'string' ? pdp_summary.trim() : '';
    const cleanSubmissionKey = submission_key && typeof submission_key === 'string' ? submission_key.trim() : '';

    if (!cleanTitle || cleanTitle.length < 5 || cleanTitle.length > 255) {
      errors.title = 'Report title must be between 5 and 255 characters.';
    }

    if (!cleanReviewsSummary || cleanReviewsSummary.length < 10) {
      errors.reviews_summary = 'Reviews summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }

    if (!cleanPipSummary || cleanPipSummary.length < 10) {
      errors.pip_summary = 'PIP progress summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }

    if (!cleanPdpSummary || cleanPdpSummary.length < 10) {
      errors.pdp_summary = 'PDP progress summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }

    if (!cleanSubmissionKey || cleanSubmissionKey.length < 5) {
      errors.submission_key = 'Valid submission idempotency key is required.';
    }

    if (!uploadedFile) {
      errors.reportFile = 'A report summary document (PDF, DOCX, XLSX, PNG, JPG) is required.';
    }

    if (Object.keys(errors).length > 0) {
      cleanupUploadedFile();
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Canonical payload hash calculation including actual uploaded file bytes SHA-256
    const fileBuffer = fs.readFileSync(uploadedFile.path);
    const fileContentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const parentId = parent_report_id ? parseInt(parent_report_id, 10) : null;
    const cleanRevisionNotes = req.body.revision_notes && typeof req.body.revision_notes === 'string'
      ? req.body.revision_notes.trim()
      : null;

    const payloadForHash = {
      department: manager.department,
      quarter: activeQuarter,
      year: activeYear,
      title: cleanTitle,
      reviews_summary: cleanReviewsSummary,
      pip_summary: cleanPipSummary,
      pdp_summary: cleanPdpSummary,
      recipient_id: recipient.id,
      original_filename: uploadedFile.originalname,
      file_size: uploadedFile.size,
      file_content_hash: fileContentHash,
      parent_report_id: parentId,
      revision_notes: cleanRevisionNotes,
    };
    const payloadHash = computePayloadHash(payloadForHash);

    // Database transaction with atomic duplicate/retry handling and concurrency locks
    const result = await sequelize.transaction(async (t) => {
      // 1. Acquire primary-key row lock on submitting manager to serialize submissions for this manager/dept
      await sequelize.query('SELECT id FROM users WHERE id = :managerId FOR UPDATE', {
        replacements: { managerId: manager.id },
        transaction: t,
      });

      // 2. Check submission key idempotency
      const existingKeyReport = await DepartmentReport.findOne({
        where: { submission_key: cleanSubmissionKey },
        transaction: t,
      });

      if (existingKeyReport) {
        if (existingKeyReport.payload_hash === payloadHash) {
          // Same key & identical content (including identical file bytes): recover submission
          cleanupUploadedFile();
          return { report: existingKeyReport, isDuplicate: true };
        } else {
          // Same key with different payload or different file content: 409 Conflict
          cleanupUploadedFile();
          const conflictErr = new Error('Submission key conflict: A report was already submitted with different content or attachment under this submission key.');
          conflictErr.statusCode = 409;
          throw conflictErr;
        }
      }

      // 3. Revision vs Root Report Validation
      let rootParentId = null;
      let revisionNumber = 1;

      if (parentId) {
        // Fetch parent report
        const parentReport = await DepartmentReport.findByPk(parentId, { transaction: t });

        if (!parentReport) {
          cleanupUploadedFile();
          const err = new Error('Parent report for revision was not found.');
          err.statusCode = 404;
          throw err;
        }

        if (parentReport.author_id !== manager.id || parentReport.department !== manager.department) {
          cleanupUploadedFile();
          const err = new Error('Access denied: You can only submit revisions for your own department reports.');
          err.statusCode = 403;
          throw err;
        }

        if (parentReport.quarter !== activeQuarter || parentReport.year !== activeYear) {
          cleanupUploadedFile();
          const err = new Error(`Cannot submit revisions for past or different operational cycles (${parentReport.quarter} ${parentReport.year}). Revisions are only permitted for the active cycle (${activeQuarter} ${activeYear}).`);
          err.statusCode = 400;
          throw err;
        }

        // parent_report_id strictly identifies the ROOT report
        rootParentId = parentReport.parent_report_id || parentReport.id;

        // Fetch all reports in this revision thread
        const allRevs = await DepartmentReport.findAll({
          where: {
            [Op.or]: [
              { id: rootParentId },
              { parent_report_id: rootParentId }
            ]
          },
          attributes: ['id', 'revision_number', 'author_id', 'department', 'quarter', 'year'],
          transaction: t,
        });

        const rootReport = allRevs.find(r => r.id === rootParentId);
        if (!rootReport || rootReport.author_id !== manager.id || rootReport.department !== manager.department) {
          cleanupUploadedFile();
          const err = new Error('Access denied: You can only submit revisions for your own department reports.');
          err.statusCode = 403;
          throw err;
        }

        const maxRev = allRevs.reduce((max, r) => Math.max(max, r.revision_number), 1);
        revisionNumber = maxRev + 1;

        // Mark all existing reports in thread as not latest
        await DepartmentReport.update(
          { is_latest: false },
          {
            where: {
              [Op.or]: [
                { id: rootParentId },
                { parent_report_id: rootParentId }
              ]
            },
            transaction: t,
          }
        );
      } else {
        // Initial report: verify another root report doesn't exist for the same cycle
        const existingRoot = await DepartmentReport.findOne({
          where: {
            department: manager.department,
            quarter: activeQuarter,
            year: activeYear,
            parent_report_id: null,
          },
          transaction: t,
        });

        if (existingRoot) {
          cleanupUploadedFile();
          const conflictErr = new Error(`An initial report has already been submitted for ${manager.department} (${activeQuarter} ${activeYear}). Please submit your update as a revision.`);
          conflictErr.statusCode = 409;
          conflictErr.existingReportId = existingRoot.id;
          throw conflictErr;
        }
      }

      // 4. Create DepartmentReport (Immutable)
      const newReport = await DepartmentReport.create({
        department: manager.department,
        quarter: activeQuarter,
        year: activeYear,
        title: cleanTitle,
        reviews_summary: cleanReviewsSummary,
        pip_summary: cleanPipSummary,
        pdp_summary: cleanPdpSummary,
        author_id: manager.id,
        recipient_id: recipient.id,
        file_path: uploadedFile.filename,
        original_filename: uploadedFile.originalname,
        file_size: uploadedFile.size,
        mime_type: uploadedFile.mimetype,
        revision_number: revisionNumber,
        revision_notes: cleanRevisionNotes,
        is_latest: true,
        parent_report_id: rootParentId,
        submission_key: cleanSubmissionKey,
        payload_hash: payloadHash,
        submitted_at: new Date(),
      }, { transaction: t });

      // 5. Create Notification for Designated HR Recipient
      const notifMsg = revisionNumber > 1
        ? `${manager.name} submitted Revision ${revisionNumber} of the ${manager.department} Department Summary Report for ${activeQuarter} ${activeYear}.`
        : `${manager.name} submitted the ${manager.department} Department Summary Report for ${activeQuarter} ${activeYear}.`;

      await Notification.create({
        user_id: recipient.id,
        message: notifMsg,
        link: '/department-reports',
        entity_type: 'report',
        entity_id: newReport.id,
      }, { transaction: t });

      return { report: newReport, isDuplicate: false };
    });

    if (result.isDuplicate) {
      return res.status(200).json({
        message: 'Report submission recognized as duplicate (recovered previous submission)',
        report: result.report,
        isDuplicate: true,
      });
    }

    res.status(201).json({
      message: result.report.revision_number > 1
        ? `Revision ${result.report.revision_number} of ${manager.department} department report submitted successfully.`
        : `${manager.department} department summary report submitted successfully.`,
      report: result.report,
      isDuplicate: false,
    });
  } catch (err) {
    cleanupUploadedFile();
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message, existingReportId: err.existingReportId });
    }
    console.error('Error submitting department report:', err);
    res.status(500).json({ message: 'Server error submitting department report' });
  }
});

/**
 * GET /api/reports
 * Lists reports accessible to the requesting user:
 * - Submitting Department Manager: their authored reports
 * - Designated HR Portfolio Recipient: reports addressed to their portfolio
 * - All other users: 403 Forbidden
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    let whereClause = null;

    if (user.role === 'department_manager') {
      whereClause = { author_id: user.id };
    } else if (user.role === 'employee' && (user.department === 'Human Resources' || user.department === 'HR') && user.report_portfolio) {
      whereClause = { recipient_id: user.id };
    } else {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view department summary reports.' });
    }

    const reports = await DepartmentReport.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio'] },
        { model: DepartmentReport, as: 'parentReport', attributes: ['id', 'title', 'revision_number'] },
        { model: DepartmentReport, as: 'revisions', attributes: ['id', 'title', 'revision_number', 'revision_notes', 'is_latest', 'submitted_at', 'file_path', 'original_filename', 'file_size'] },
      ],
      order: [['submitted_at', 'DESC']],
    });

    res.json(reports);
  } catch (err) {
    console.error('Error listing department reports:', err);
    res.status(500).json({ message: 'Server error retrieving department reports' });
  }
});

/**
 * GET /api/reports/:id
 * Fetches single department report details if authorized
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const report = await DepartmentReport.findByPk(reportId, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'report_portfolio'] },
        { model: DepartmentReport, as: 'parentReport', attributes: ['id', 'title', 'revision_number', 'revision_notes', 'submitted_at'] },
        { model: DepartmentReport, as: 'revisions', attributes: ['id', 'title', 'revision_number', 'revision_notes', 'is_latest', 'submitted_at', 'file_path', 'original_filename', 'file_size'] },
      ],
    });

    if (!report) {
      return res.status(404).json({ message: 'Department report not found' });
    }

    // Access control: strictly author or recipient
    if (report.author_id !== req.user.id && report.recipient_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this report.' });
    }

    res.json(report);
  } catch (err) {
    console.error('Error fetching report details:', err);
    res.status(500).json({ message: 'Server error retrieving report details' });
  }
});

/**
 * GET /api/reports/:id/download
 * Streams the attached report document to authorized author or recipient
 */
router.get('/:id/download', auth, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const report = await DepartmentReport.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Department report not found' });
    }

    // Access control: strictly author or recipient
    if (report.author_id !== req.user.id && report.recipient_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to download this report document.' });
    }

    const filePath = path.join(REPORT_STORAGE_DIR, report.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Report document file not found on disk.' });
    }

    res.setHeader('Content-Type', report.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.original_filename)}"`);
    res.setHeader('Content-Length', report.file_size);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Error downloading report document:', err);
    res.status(500).json({ message: 'Server error downloading report document' });
  }
});

module.exports = router;
