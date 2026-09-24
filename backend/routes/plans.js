const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Evidence = require('../models/Evidence');
const EvidenceFeedback = require('../models/EvidenceFeedback');
const auth = require('../middleware/auth');
const { calculatePipDeadline } = require('../utils/pipDeadline');
const { validatePlanInputs } = require('../utils/planValidator');
const {
  handleEvidenceUpload,
  EVIDENCE_STORAGE_DIR,
} = require('../middleware/evidenceUpload');

/**
 * Compute SHA-256 hash of a file on disk
 * @param {string} filePath 
 * @returns {string|null}
 */
function computeFileSha256(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileBuf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuf).digest('hex');
  } catch (_err) {
    return null;
  }
}

/**
 * Determine active quarter and year using Asia/Colombo timezone.
 * Q1: January - April
 * Q2: May - August
 * Q3: September - December
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

// GET /api/plans/eligible-recipients
router.get('/eligible-recipients', auth, async (req, res) => {
  try {
    const { quarter: activeQuarter, year: activeYear } = getActiveQuarterAndYear();

    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!['team_manager', 'department_manager', 'operational_manager', 'company_manager', 'hr_manager'].includes(manager.role)) {
      return res.status(403).json({ message: 'Only Team Managers, Department Managers, Operational Managers, and HR Manager can assign plans' });
    }

    let recipients = [];

    if (manager.role === 'team_manager') {
      if (!manager.department) {
        return res.status(400).json({ message: 'Manager missing departmental assignment' });
      }
      if (!manager.team) {
        return res.status(400).json({ message: 'Team Manager missing team assignment' });
      }

      recipients = await User.findAll({
        where: {
          manager_id: manager.id,
          department: manager.department,
          team: manager.team,
          role: 'employee',
          quarter_batch: activeQuarter
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
        order: [['name', 'ASC']]
      });
    } else if (manager.role === 'department_manager') {
      if (!manager.department) {
        return res.status(400).json({ message: 'Manager missing departmental assignment' });
      }

      recipients = await User.findAll({
        where: {
          manager_id: manager.id,
          department: manager.department,
          role: 'team_manager'
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
        order: [['name', 'ASC']]
      });
    } else if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
      recipients = await User.findAll({
        where: {
          manager_id: manager.id,
          role: { [Op.in]: ['department_manager', 'hr_manager'] }
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch'],
        order: [['name', 'ASC']]
      });
    } else if (manager.role === 'hr_manager') {
      recipients = await User.findAll({
        where: {
          manager_id: manager.id,
          role: 'employee',
          department: ['Human Resources', 'HR']
        },
        attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch', 'report_portfolio'],
        order: [['name', 'ASC']]
      });
    }

    const recipientIds = recipients.map(r => r.id);
    const existingPlans = await Plan.findAll({
      where: {
        recipient_id: recipientIds,
        quarter: activeQuarter,
        year: activeYear
      },
      attributes: ['recipient_id', 'type', 'status']
    });

    const plansByRecipient = {};
    for (const p of existingPlans) {
      if (!plansByRecipient[p.recipient_id]) {
        plansByRecipient[p.recipient_id] = new Set();
      }
      plansByRecipient[p.recipient_id].add(p.type);
    }

    const recipientsWithStatus = recipients.map(r => {
      const types = plansByRecipient[r.id] ? Array.from(plansByRecipient[r.id]) : [];
      return {
        ...r.toJSON(),
        assignedPlanTypes: types,
        hasPip: types.includes('PIP'),
        hasPdp: types.includes('PDP')
      };
    });

    res.json({
      activeQuarter,
      activeYear,
      manager: {
        id: manager.id,
        name: manager.name,
        role: manager.role,
        department: manager.department,
        team: manager.team
      },
      recipients: recipientsWithStatus
    });
  } catch (err) {
    console.error('Error fetching eligible plan recipients:', err);
    res.status(500).json({ message: 'Server error retrieving eligible recipients' });
  }
});

// POST /api/plans
router.post('/', auth, async (req, res) => {
  try {
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (manager.role === 'admin') {
      return res.status(403).json({ message: 'Administrators are not permitted to assign plans' });
    }

    if (!['team_manager', 'department_manager', 'operational_manager', 'company_manager', 'hr_manager'].includes(manager.role)) {
      return res.status(403).json({ message: 'Only Team Managers, Department Managers, Operational Managers, and HR Manager can assign plans' });
    }

    const { quarter: activeQuarter, year: activeYear } = getActiveQuarterAndYear();
    const { type, recipient_id, title, description } = req.body;

    if (!type || !['PIP', 'PDP'].includes(type)) {
      return res.status(400).json({ message: 'Valid plan type (PIP or PDP) is required' });
    }

    const recipientIdNum = parseInt(recipient_id, 10);
    if (!recipientIdNum || isNaN(recipientIdNum)) {
      return res.status(400).json({ message: 'A valid recipient must be selected' });
    }

    const planValidation = validatePlanInputs(title, description);
    if (!planValidation.isValid) {
      return res.status(400).json({
        message: planValidation.message,
        errors: planValidation.errors
      });
    }
    const cleanTitle = planValidation.cleanTitle;
    const cleanDescription = planValidation.cleanDescription;

    let cleanDueDate = null;
    if (type === 'PIP') {
      const deadlineInfo = calculatePipDeadline(new Date());
      cleanDueDate = deadlineInfo.dueDateISO;
    }

    const recipient = await User.findByPk(recipientIdNum);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (manager.role === 'team_manager') {
      const isDirectReport =
        recipient.manager_id === manager.id &&
        recipient.department === manager.department &&
        recipient.team === manager.team &&
        recipient.role === 'employee' &&
        recipient.quarter_batch === activeQuarter;

      if (!isDirectReport) {
        return res.status(403).json({
          message: 'Recipient is not an eligible direct employee in your team for the active quarter'
        });
      }
    } else if (manager.role === 'department_manager') {
      const isDirectTM =
        recipient.manager_id === manager.id &&
        recipient.department === manager.department &&
        recipient.role === 'team_manager';

      if (!isDirectTM) {
        return res.status(403).json({
          message: 'Recipient is not an eligible direct Team Manager in your department'
        });
      }
    } else if (manager.role === 'operational_manager' || manager.role === 'company_manager') {
      const isDirectDeptHead =
        recipient.manager_id === manager.id &&
        ['department_manager', 'hr_manager'].includes(recipient.role);

      if (!isDirectDeptHead) {
        return res.status(403).json({
          message: 'Recipient is not an eligible direct Department Head'
        });
      }
    } else if (manager.role === 'hr_manager') {
      const isDirectHREmployee =
        recipient.manager_id === manager.id &&
        recipient.role === 'employee' &&
        ['Human Resources', 'HR'].includes(recipient.department);

      if (!isDirectHREmployee) {
        return res.status(403).json({
          message: 'Recipient is not an eligible direct HR employee'
        });
      }
    }

    const result = await sequelize.transaction(async (t) => {
      await User.findByPk(recipient.id, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      const existingPlan = await Plan.findOne({
        where: {
          recipient_id: recipient.id,
          type,
          quarter: activeQuarter,
          year: activeYear
        },
        transaction: t
      });

      if (existingPlan) {
        const conflictErr = new Error(`${recipient.name} already has a ${type} plan assigned for ${activeQuarter} ${activeYear}.`);
        conflictErr.statusCode = 409;
        throw conflictErr;
      }

      const plan = await Plan.create({
        type,
        title: cleanTitle,
        description: cleanDescription,
        manager_id: manager.id,
        recipient_id: recipient.id,
        quarter: activeQuarter,
        year: activeYear,
        due_date: cleanDueDate,
        status: 'pending'
      }, { transaction: t });

      const task = await Task.create({
        type: type.toLowerCase(),
        status: 'pending',
        quarter: activeQuarter,
        year: activeYear,
        assignee_id: recipient.id,
        reviewee_id: recipient.id,
        plan_id: plan.id,
        message: cleanTitle
      }, { transaction: t });

      const notification = await Notification.create({
        user_id: recipient.id,
        message: `You have been assigned a ${type} plan: "${cleanTitle}" by ${manager.name}.`,
        link: '/my-tasks',
        entity_type: 'plan',
        entity_id: plan.id
      }, { transaction: t });

      return { plan, task, notification };
    });

    res.status(201).json({
      message: `${type} plan assigned successfully`,
      plan: result.plan,
      taskId: result.task.id,
      notificationId: result.notification.id
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Error assigning plan:', err);
    res.status(500).json({ message: 'Server error while assigning plan' });
  }
});

// GET /api/plans/assigned
// Assigning Manager retrieves all plans assigned by them to direct reports
router.get('/assigned', auth, async (req, res) => {
  try {
    const manager = await User.findByPk(req.user.id);
    if (!manager) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!['team_manager', 'department_manager', 'operational_manager', 'company_manager', 'hr_manager'].includes(manager.role)) {
      return res.status(403).json({ message: 'Only Team Managers, Department Managers, Operational Managers, and HR Manager can view assigned plans' });
    }

    const plans = await Plan.findAll({
      where: {
        manager_id: manager.id
      },
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team', 'quarter_batch']
        },
        {
          model: Evidence,
          as: 'evidences',
          attributes: ['id', 'original_filename', 'file_size', 'submitted_at', 'note']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(plans);
  } catch (err) {
    console.error('Error fetching assigned plans:', err);
    res.status(500).json({ message: 'Server error retrieving assigned plans' });
  }
});

/**
 * Validate meaningful written feedback from manager
 * @param {string} rawFeedback 
 * @returns {{ isValid: boolean, cleanFeedback: string|null, message: string|null }}
 */
function validateFeedbackText(rawFeedback) {
  if (!rawFeedback || typeof rawFeedback !== 'string') {
    return { isValid: false, cleanFeedback: null, message: 'Feedback text is required and cannot be empty.' };
  }
  const trimmed = rawFeedback.trim();
  if (trimmed.length === 0) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback text cannot be empty or whitespace only.' };
  }
  if (trimmed.length < 10) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback must be at least 10 characters long to provide meaningful guidance.' };
  }
  if (trimmed.length > 2000) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback text cannot exceed 2000 characters.' };
  }

  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback must contain at least 2 words describing your evaluation or guidance.' };
  }

  // Reject punctuation-only (e.g. "...", "---", "___", "!@#$")
  if (/^[\s.,_\-!@#$%^&*()+=/\\|<>?~`"':;{}]+$/.test(trimmed)) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback cannot consist solely of punctuation or symbols.' };
  }

  // Reject repetitive filler (e.g. "aaaaa", "zzzzzz")
  if (/^(.)\1{4,}$/i.test(trimmed)) {
    return { isValid: false, cleanFeedback: null, message: 'Feedback cannot consist of repeated characters.' };
  }

  // Reject obvious placeholder filler words
  const fillerWordRegex = /^(test|testing|asdf|qwerty|abc|sample|dummy|filler|feedback|note|1234|xyz|temp)$/i;
  const isPureFiller = words.every(w => fillerWordRegex.test(w.replace(/[^\w]/g, '')));
  if (isPureFiller) {
    return { isValid: false, cleanFeedback: null, message: 'Please provide meaningful, descriptive feedback for the recipient.' };
  }

  return { isValid: true, cleanFeedback: trimmed, message: null };
}

// GET /api/plans/:id
// Recipient or Assigning Manager views details of assigned PIP/PDP plan with multi-evidence history & feedback
router.get('/:id', auth, async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    if (!planId || isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await Plan.findByPk(planId, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email', 'role', 'department', 'team']
        },
        {
          model: Evidence,
          as: 'evidences',
          attributes: ['id', 'original_filename', 'file_size', 'mime_type', 'note', 'submitted_at', 'createdAt'],
          include: [
            {
              model: EvidenceFeedback,
              as: 'feedbacks',
              attributes: ['id', 'feedback_text', 'idempotency_key', 'createdAt', 'updatedAt'],
              include: [
                {
                  model: User,
                  as: 'manager',
                  attributes: ['id', 'name', 'email', 'role', 'department', 'team']
                }
              ]
            }
          ]
        }
      ],
      order: [
        [{ model: Evidence, as: 'evidences' }, 'submitted_at', 'DESC'],
        [{ model: Evidence, as: 'evidences' }, { model: EvidenceFeedback, as: 'feedbacks' }, 'createdAt', 'ASC'],
        [{ model: Evidence, as: 'evidences' }, { model: EvidenceFeedback, as: 'feedbacks' }, 'id', 'ASC']
      ]
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const isRecipient = plan.recipient_id === req.user.id;
    const isAssigningManager = plan.manager_id === req.user.id;

    // Strict authorization: Only the assigned recipient OR assigning manager may access
    if (!isRecipient && !isAssigningManager) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this plan' });
    }

    // Lifecycle status evaluation
    let lifecycleStatus;
    if (plan.type === 'PDP') {
      lifecycleStatus = {
        isPdp: true,
        isOpen: plan.status !== 'completed',
        reason: plan.status === 'completed'
          ? 'This Personal Development Plan has been completed and concluded.'
          : 'Ongoing Personal Development Plan — open for continuous evidence submissions.'
      };
    } else {
      // PIP: Evidence submission deadline from assignment / stored due date in Asia/Colombo
      const pipDeadline = calculatePipDeadline(plan.createdAt, null, plan.due_date);
      lifecycleStatus = {
        isPip: true,
        isOpen: pipDeadline.isOpen && plan.status !== 'completed',
        deadline: pipDeadline.dueDateFormatted,
        deadlineISO: pipDeadline.dueDateISO,
        isPast: pipDeadline.isPast,
        reason: plan.status === 'completed'
          ? 'This Performance Improvement Plan has been concluded.'
          : pipDeadline.reason
      };
    }

    const planJson = plan.toJSON();
    if (planJson.evidences && Array.isArray(planJson.evidences)) {
      for (const ev of planJson.evidences) {
        if (ev.feedbacks && Array.isArray(ev.feedbacks)) {
          ev.feedbacks.sort((a, b) => {
            const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (timeDiff !== 0) return timeDiff;
            return (a.id || 0) - (b.id || 0);
          });
        }
      }
    }

    res.json({
      ...planJson,
      isRecipient,
      isAssigningManager,
      canEndPdp: isAssigningManager && plan.type === 'PDP' && plan.status !== 'completed',
      lifecycleStatus
    });
  } catch (err) {
    console.error('Error fetching plan details:', err);
    res.status(500).json({ message: 'Server error retrieving plan details' });
  }
});

// POST /api/plans/:id/evidence
// Recipient submits/appends an evidence document or image
router.post('/:id/evidence', auth, (req, res) => {
  handleEvidenceUpload(req, res, async () => {
    const uploadedFilePath = req.file ? req.file.path : null;

    const cleanupUploadedFile = () => {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkErr) {
          console.error('Failed to delete temporary upload file:', unlinkErr);
        }
      }
    };

    try {
      const planId = parseInt(req.params.id, 10);
      if (!planId || isNaN(planId)) {
        cleanupUploadedFile();
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const currentUser = await User.findByPk(req.user.id);
      if (!currentUser) {
        cleanupUploadedFile();
        return res.status(401).json({ message: 'User not found' });
      }

      if (!['employee', 'team_manager', 'department_manager', 'hr_manager'].includes(currentUser.role)) {
        cleanupUploadedFile();
        return res.status(403).json({ message: 'Only assigned plan recipients can submit plan evidence' });
      }

      const plan = await Plan.findByPk(planId, {
        include: [
          { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
        ]
      });

      if (!plan) {
        cleanupUploadedFile();
        return res.status(404).json({ message: 'Plan not found' });
      }

      // Recipient-only submission rule
      if (plan.recipient_id !== req.user.id) {
        cleanupUploadedFile();
        return res.status(403).json({ message: 'Access denied: You are not the assigned recipient of this plan' });
      }

      // Concluded/completed plans do not accept new submissions
      if (plan.status === 'completed') {
        cleanupUploadedFile();
        return res.status(400).json({ message: 'Cannot submit evidence for a concluded plan.' });
      }

      // Lifecycle check
      if (plan.type === 'PIP') {
        const pipDeadline = calculatePipDeadline(plan.createdAt, null, plan.due_date);
        if (pipDeadline.isPast) {
          cleanupUploadedFile();
          return res.status(400).json({ message: pipDeadline.reason });
        }
      }

      // Extract client idempotency key if provided
      const rawIdempotencyKey = (req.body.idempotency_key || req.body.submission_key || req.headers['idempotency-key'] || '').trim();
      const idempotencyKey = rawIdempotencyKey.length > 0 ? rawIdempotencyKey.slice(0, 128) : null;

      // Compute payload SHA-256 hash (file hash + clean note)
      const fileSha256 = computeFileSha256(req.file.path);
      const payloadHash = crypto.createHash('sha256').update(fileSha256 || '').update(req.cleanNote || '').digest('hex');

      // Atomic persistence: append evidence record & notify manager
      const result = await sequelize.transaction(async (t) => {
        const lockedPlan = await Plan.findByPk(plan.id, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (!lockedPlan || lockedPlan.recipient_id !== req.user.id) {
          const authErr = new Error('Access denied');
          authErr.statusCode = 403;
          throw authErr;
        }

        if (lockedPlan.status === 'completed') {
          const compErr = new Error('Cannot submit evidence for a concluded plan');
          compErr.statusCode = 400;
          throw compErr;
        }

        if (lockedPlan.type === 'PIP') {
          const recheckDeadline = calculatePipDeadline(lockedPlan.createdAt, null, lockedPlan.due_date);
          if (recheckDeadline.isPast) {
            const deadErr = new Error(recheckDeadline.reason);
            deadErr.statusCode = 400;
            throw deadErr;
          }
        }

        // Submission-key idempotency check
        if (idempotencyKey) {
          const existingByKey = await Evidence.findOne({
            where: {
              plan_id: lockedPlan.id,
              recipient_id: req.user.id,
              idempotency_key: idempotencyKey
            },
            transaction: t
          });

          if (existingByKey) {
            cleanupUploadedFile();
            // Same key & same payload -> idempotent return of original result
            if (existingByKey.payload_hash === payloadHash) {
              return { savedEvidence: existingByKey, isDuplicate: true };
            }
            // Same key & different payload -> 409 Conflict
            const conflictErr = new Error('Idempotency conflict: A submission with this key already exists with different payload or contents.');
            conflictErr.statusCode = 409;
            throw conflictErr;
          }
        }

        // Generate effective key if not provided by client
        const effectiveKey = idempotencyKey || `auto_${crypto.randomBytes(16).toString('hex')}`;

        // Create new evidence record (append to multi-evidence history)
        const savedEvidence = await Evidence.create({
          plan_id: lockedPlan.id,
          recipient_id: req.user.id,
          file_path: path.basename(req.file.path),
          original_filename: req.file.sanitizedOriginalName,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          note: req.cleanNote || null,
          idempotency_key: effectiveKey,
          payload_hash: payloadHash,
          submitted_at: new Date()
        }, { transaction: t });

        // Update plan status to evidence_submitted
        lockedPlan.status = 'evidence_submitted';
        await lockedPlan.save({ transaction: t });

        // Notify assigning manager
        const managerNotification = await Notification.create({
          user_id: lockedPlan.manager_id,
          message: `${currentUser.name} has submitted evidence for ${lockedPlan.type} plan: "${lockedPlan.title}".`,
          link: '/assigned-plans',
          entity_type: 'plan',
          entity_id: lockedPlan.id
        }, { transaction: t });

        return { savedEvidence, managerNotification, isDuplicate: false };
      });

      const responseStatus = result.isDuplicate ? 200 : 201;
      res.status(responseStatus).json({
        message: result.isDuplicate ? 'Evidence already received' : 'Evidence submitted successfully',
        evidence: {
          id: result.savedEvidence.id,
          original_filename: result.savedEvidence.original_filename,
          file_size: result.savedEvidence.file_size,
          mime_type: result.savedEvidence.mime_type,
          note: result.savedEvidence.note,
          idempotency_key: result.savedEvidence.idempotency_key,
          submitted_at: result.savedEvidence.submitted_at
        },
        planStatus: 'evidence_submitted',
        isDuplicate: result.isDuplicate
      });

    } catch (err) {
      cleanupUploadedFile();
      const statusCode = err.statusCode || 500;
      console.error('Error submitting plan evidence:', err);
      res.status(statusCode).json({ message: err.message || 'Server error while submitting evidence' });
    }
  });
});

// PATCH & PUT /api/plans/:id/end-pdp
// Assigning Manager marks an active PDP as completed and concluded
const handleEndPdp = async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    if (!planId || isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await Plan.findByPk(planId, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Only the assigning manager can end a PDP
    if (plan.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Only the assigning manager can end this development plan' });
    }

    if (plan.type !== 'PDP') {
      return res.status(400).json({ message: 'Only Personal Development Plans (PDP) can be ended via this action' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ message: 'This Personal Development Plan is already completed' });
    }

    const manager = await User.findByPk(req.user.id);

    await sequelize.transaction(async (t) => {
      const lockedPlan = await Plan.findByPk(plan.id, { transaction: t, lock: t.LOCK.UPDATE });
      lockedPlan.status = 'completed';
      await lockedPlan.save({ transaction: t });

      // Update linked Task status to completed as well for consistency
      await Task.update(
        { status: 'completed' },
        { where: { plan_id: lockedPlan.id }, transaction: t }
      );

      // Notify recipient that plan was concluded
      await Notification.create({
        user_id: lockedPlan.recipient_id,
        message: `Your Personal Development Plan "${lockedPlan.title}" has been concluded and marked completed by ${manager.name}.`,
        link: '/my-tasks',
        entity_type: 'plan',
        entity_id: lockedPlan.id
      }, { transaction: t });
    });

    res.status(200).json({
      message: 'Personal Development Plan ended and marked completed successfully',
      planId: plan.id,
      status: 'completed'
    });
  } catch (err) {
    console.error('Error ending PDP:', err);
    res.status(500).json({ message: 'Server error while ending Personal Development Plan' });
  }
};

router.patch('/:id/end-pdp', auth, handleEndPdp);
router.put('/:id/end-pdp', auth, handleEndPdp);

// POST & PATCH /api/plans/:id/complete
// Assigning Manager marks a plan (PIP or PDP) as completed
const handleCompletePlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    if (!planId || isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await Plan.findByPk(planId, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (plan.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Only the assigning manager can complete this plan' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ message: 'This plan is already completed' });
    }

    const manager = await User.findByPk(req.user.id);

    await sequelize.transaction(async (t) => {
      const lockedPlan = await Plan.findByPk(plan.id, { transaction: t, lock: t.LOCK.UPDATE });
      lockedPlan.status = 'completed';
      await lockedPlan.save({ transaction: t });

      await Task.update(
        { status: 'completed' },
        { where: { plan_id: lockedPlan.id }, transaction: t }
      );

      await Notification.create({
        user_id: lockedPlan.recipient_id,
        message: `Your ${lockedPlan.type} plan "${lockedPlan.title}" has been concluded and marked completed by ${manager.name}.`,
        link: '/my-tasks',
        entity_type: 'plan',
        entity_id: lockedPlan.id
      }, { transaction: t });
    });

    res.status(200).json({
      message: `${plan.type} plan marked completed successfully`,
      planId: plan.id,
      status: 'completed'
    });
  } catch (err) {
    console.error('Error completing plan:', err);
    res.status(500).json({ message: 'Server error while completing plan' });
  }
};

router.post('/:id/complete', auth, handleCompletePlan);
router.patch('/:id/complete', auth, handleCompletePlan);

// POST, PATCH, & DELETE /api/plans/:id/cancel
// Assigning Manager cancels an active plan
const handleCancelPlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    if (!planId || isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await Plan.findByPk(planId, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (plan.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Only the assigning manager can cancel this plan' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel an already completed plan' });
    }

    if (plan.status === 'cancelled') {
      return res.status(400).json({ message: 'This plan is already cancelled' });
    }

    const manager = await User.findByPk(req.user.id);

    await sequelize.transaction(async (t) => {
      const lockedPlan = await Plan.findByPk(plan.id, { transaction: t, lock: t.LOCK.UPDATE });
      lockedPlan.status = 'cancelled';
      await lockedPlan.save({ transaction: t });

      await Task.update(
        { status: 'cancelled' },
        { where: { plan_id: lockedPlan.id }, transaction: t }
      );

      await Notification.create({
        user_id: lockedPlan.recipient_id,
        message: `Your ${lockedPlan.type} plan "${lockedPlan.title}" has been cancelled by ${manager.name}.`,
        link: '/my-tasks',
        entity_type: 'plan',
        entity_id: lockedPlan.id
      }, { transaction: t });
    });

    res.status(200).json({
      message: `${plan.type} plan cancelled successfully`,
      planId: plan.id,
      status: 'cancelled'
    });
  } catch (err) {
    console.error('Error cancelling plan:', err);
    res.status(500).json({ message: 'Server error while cancelling plan' });
  }
};

router.post('/:id/cancel', auth, handleCancelPlan);
router.patch('/:id/cancel', auth, handleCancelPlan);
router.delete('/:id', auth, handleCancelPlan);

// PATCH /api/plans/:id
// Assigning Manager updates plan details or status
router.patch('/:id', auth, async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    if (!planId || isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    if (plan.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Only the assigning manager can update this plan' });
    }

    const { title, description, status } = req.body;

    if (status && !['pending', 'evidence_submitted', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid plan status' });
    }

    if (title !== undefined || description !== undefined) {
      const planValidation = validatePlanInputs(
        title !== undefined ? title : plan.title,
        description !== undefined ? description : plan.description
      );
      if (!planValidation.isValid) {
        return res.status(400).json({
          message: planValidation.message,
          errors: planValidation.errors
        });
      }
      if (title !== undefined) plan.title = planValidation.cleanTitle;
      if (description !== undefined) plan.description = planValidation.cleanDescription;
    }

    if (status !== undefined) {
      plan.status = status;
      await Task.update(
        { status: status === 'evidence_submitted' ? 'pending' : status },
        { where: { plan_id: plan.id } }
      );
    }

    await plan.save();

    res.json({
      message: 'Plan updated successfully',
      plan
    });
  } catch (err) {
    console.error('Error updating plan:', err);
    res.status(500).json({ message: 'Server error while updating plan' });
  }
});

// GET /api/plans/:id/evidence/:evidenceId/download
// Recipient or Assigning Manager downloads specific evidence file
router.get('/:id/evidence/:evidenceId/download', auth, async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);

    if (!planId || isNaN(planId) || !evidenceId || isNaN(evidenceId)) {
      return res.status(400).json({ message: 'Invalid plan or evidence ID' });
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Strict authorization: Only recipient or assigning manager
    if (plan.recipient_id !== req.user.id && plan.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to download evidence for this plan' });
    }

    const evidence = await Evidence.findOne({
      where: {
        id: evidenceId,
        plan_id: plan.id
      }
    });

    if (!evidence) {
      return res.status(404).json({ message: 'Evidence file not found for this plan' });
    }

    const safeFilePath = path.resolve(EVIDENCE_STORAGE_DIR, evidence.file_path);

    if (!safeFilePath.startsWith(EVIDENCE_STORAGE_DIR)) {
      return res.status(403).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).json({ message: 'Evidence file not found on disk' });
    }

    res.download(safeFilePath, evidence.original_filename);
  } catch (err) {
    console.error('Error downloading evidence file:', err);
    res.status(500).json({ message: 'Server error downloading evidence file' });
  }
});

// POST /api/plans/:id/evidence/:evidenceId/feedback
// Assigning Manager submits feedback on a specific evidence deliverable
router.post('/:id/evidence/:evidenceId/feedback', auth, async (req, res) => {
  try {
    const planId = parseInt(req.params.id, 10);
    const evidenceId = parseInt(req.params.evidenceId, 10);

    if (!planId || isNaN(planId) || !evidenceId || isNaN(evidenceId)) {
      return res.status(400).json({ message: 'Invalid plan or evidence ID' });
    }

    const plan = await Plan.findByPk(planId, {
      include: [
        { model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Strict Authorization: Only the assigning manager can write feedback
    if (plan.manager_id !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Only the assigning manager can provide feedback on this plan\'s evidence'
      });
    }

    const evidence = await Evidence.findOne({
      where: {
        id: evidenceId,
        plan_id: plan.id
      }
    });

    if (!evidence) {
      return res.status(404).json({ message: 'Evidence submission not found for this plan' });
    }

    const feedbackValidation = validateFeedbackText(req.body.feedback_text);
    if (!feedbackValidation.isValid) {
      return res.status(400).json({ message: feedbackValidation.message });
    }

    // Extract idempotency key
    const rawIdempotencyKey = (req.body.idempotency_key || req.headers['idempotency-key'] || '').trim();
    const idempotencyKey = rawIdempotencyKey.length > 0 ? rawIdempotencyKey.slice(0, 128) : null;

    const result = await sequelize.transaction(async (t) => {
      // Re-verify plan
      const lockedPlan = await Plan.findByPk(plan.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!lockedPlan || lockedPlan.manager_id !== req.user.id) {
        const authErr = new Error('Access denied: Only assigning manager may submit feedback');
        authErr.statusCode = 403;
        throw authErr;
      }

      // Check idempotency
      if (idempotencyKey) {
        const existingFeedback = await EvidenceFeedback.findOne({
          where: {
            evidence_id: evidence.id,
            manager_id: req.user.id,
            idempotency_key: idempotencyKey
          },
          include: [{ model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] }],
          transaction: t
        });

        if (existingFeedback) {
          if (existingFeedback.feedback_text === feedbackValidation.cleanFeedback) {
            return { savedFeedback: existingFeedback, isDuplicate: true };
          }
          const conflictErr = new Error('Idempotency conflict: A feedback submission with this key already exists with different text.');
          conflictErr.statusCode = 409;
          throw conflictErr;
        }
      }

      const effectiveKey = idempotencyKey || `fb_auto_${crypto.randomBytes(16).toString('hex')}`;

      const createdFeedback = await EvidenceFeedback.create({
        evidence_id: evidence.id,
        plan_id: lockedPlan.id,
        manager_id: req.user.id,
        feedback_text: feedbackValidation.cleanFeedback,
        idempotency_key: effectiveKey,
      }, { transaction: t });

      const manager = await User.findByPk(req.user.id, { transaction: t });

      // Notify recipient that manager provided feedback
      const notification = await Notification.create({
        user_id: lockedPlan.recipient_id,
        message: `${manager.name} provided feedback on your evidence deliverable "${evidence.original_filename}" for ${lockedPlan.type} plan: "${lockedPlan.title}".`,
        link: '/my-tasks',
        entity_type: 'plan',
        entity_id: lockedPlan.id
      }, { transaction: t });

      const reloaded = await EvidenceFeedback.findByPk(createdFeedback.id, {
        include: [{ model: User, as: 'manager', attributes: ['id', 'name', 'email', 'role', 'department', 'team'] }],
        transaction: t
      });

      return { savedFeedback: reloaded, isDuplicate: false, notification };
    });

    const responseStatus = result.isDuplicate ? 200 : 201;
    res.status(responseStatus).json({
      message: result.isDuplicate ? 'Feedback already recorded' : 'Feedback submitted successfully',
      feedback: result.savedFeedback,
      isDuplicate: result.isDuplicate
    });

  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Error submitting evidence feedback:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error while submitting feedback' });
  }
});

module.exports = router;

