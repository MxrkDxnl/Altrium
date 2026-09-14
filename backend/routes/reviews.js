const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Review = require('../models/Review');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Check quarterly expiration
function isTaskExpired(task) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  if (currentYear > task.year) return true;
  if (currentYear === task.year) {
    if (task.quarter === 'Q1' && currentMonth > 3) return true;
    if (task.quarter === 'Q2' && currentMonth > 7) return true;
    if (task.quarter === 'Q3' && currentMonth > 11) return true;
  }
  return false;
}

// POST /api/reviews/draft
// Save a draft review (for single or grouped reviews)
router.post('/draft', auth, async (req, res) => {
  try {
    const { taskId, draftContent, content } = req.body;
    const dataToSave = draftContent !== undefined ? draftContent : content;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignee_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to save draft for this review task' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ message: 'Cannot save draft on a completed review task' });
    }

    if (isTaskExpired(task)) {
      return res.status(403).json({ message: 'The submission window for this quarter has expired.' });
    }

    task.draft_content = dataToSave || null;
    await task.save();

    res.json({
      message: 'Draft saved successfully',
      draftContent: task.draft_content
    });
  } catch (err) {
    console.error('Error saving review draft:', err);
    res.status(500).json({ message: 'Server error while saving draft' });
  }
});

const crypto = require('crypto');

// Canonical payload hashing helper
function computePayloadHash(payload) {
  function canonicalize(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(canonicalize);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize(obj[key]);
    }
    return result;
  }
  const canonical = canonicalize(payload);
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

// POST /api/reviews/submit
// Submit self, peer, upward, or grouped downward review
router.post('/submit', auth, async (req, res) => {
  try {
    const { taskId, content, groupContent, submissionKey: rawSubmissionKey, submission_key: altSubmissionKey } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignee_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to submit this review' });
    }

    // Extract client submission key / idempotency key
    const headerKey = req.headers['x-submission-key'] || req.headers['idempotency-key'];
    const rawKey = rawSubmissionKey || altSubmissionKey || headerKey;
    const submissionKey = rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim().slice(0, 128) : null;

    const isGrouped = task.type === 'downward_review' || 
      (Array.isArray(task.group_subject_ids) && task.group_subject_ids.length > 0);

    const submissionPayload = isGrouped ? (groupContent || content) : content;
    if (!submissionPayload || typeof submissionPayload !== 'object') {
      return res.status(400).json({ message: isGrouped ? 'Submission content is required for all subjects' : 'Submission content is required' });
    }

    const payloadHash = computePayloadHash(submissionPayload);

    if (isTaskExpired(task)) {
      return res.status(403).json({ message: 'The submission window for this quarter has expired.' });
    }

    if (isGrouped) {
      for (const subjectId of task.group_subject_ids) {
        const item = submissionPayload[subjectId] || submissionPayload[subjectId.toString()];
        if (!item || !item.techSkills || !item.techSkills.trim() || !item.commRating || item.commRating === 'Select a rating') {
          return res.status(400).json({
            message: 'Please complete all required fields (Technical Skills and Communication Rating) for each reviewed employee before submitting.'
          });
        }
      }
    } else {
      if (!submissionPayload.techSkills || !submissionPayload.techSkills.trim() || !submissionPayload.commRating || submissionPayload.commRating === 'Select a rating') {
        return res.status(400).json({ message: 'Please fill all required fields (Technical Skills and Communication Rating).' });
      }
    }

    const result = await sequelize.transaction(async (t) => {
      const lockedTask = await Task.findByPk(taskId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      // Durable Retry Handling for Completed Tasks
      if (lockedTask.status === 'completed') {
        if (submissionKey && lockedTask.submission_key && lockedTask.submission_key === submissionKey) {
          if (lockedTask.payload_hash === payloadHash) {
            // Same key & identical payload -> return original success without new reviews or notifications
            return {
              isDuplicate: true,
              message: isGrouped ? 'All reviews submitted successfully' : 'Review submitted successfully'
            };
          }
          // Same key & different payload -> 409 Conflict
          const conflictErr = new Error('Submission key conflict: This review was already submitted with different content.');
          conflictErr.statusCode = 409;
          throw conflictErr;
        }

        const compErr = new Error('This review task has already been completed');
        compErr.statusCode = 400;
        throw compErr;
      }

      // Generate durable effective key if not provided
      const effectiveKey = submissionKey || `sub_${crypto.randomBytes(16).toString('hex')}`;

      // Delete any partial reviews for this task if retrying from an uncompleted state
      await Review.destroy({
        where: { task_id: lockedTask.id },
        transaction: t
      });

      if (isGrouped) {
        // Insert atomic review records for each subject
        for (const subjectId of lockedTask.group_subject_ids) {
          const item = submissionPayload[subjectId] || submissionPayload[subjectId.toString()];
          await Review.create({
            task_id: lockedTask.id,
            reviewer_id: req.user.id,
            reviewee_id: subjectId,
            content: item
          }, { transaction: t });
        }
      } else {
        await Review.create({
          task_id: lockedTask.id,
          reviewer_id: req.user.id,
          reviewee_id: lockedTask.reviewee_id,
          content: submissionPayload
        }, { transaction: t });
      }

      // Complete the task and store submission metadata
      lockedTask.status = 'completed';
      lockedTask.draft_content = null;
      lockedTask.submission_key = effectiveKey;
      lockedTask.payload_hash = payloadHash;
      await lockedTask.save({ transaction: t });

      // Notify manager / assigner (single notification)
      const reviewer = await User.findByPk(req.user.id, { transaction: t });
      const assignerId = lockedTask.assigner_id || (reviewer ? reviewer.manager_id : null);
      if (assignerId) {
        const assigner = await User.findByPk(assignerId, { transaction: t });
        const isReviewTableMgr = assigner && ['team_manager', 'department_manager', 'company_manager'].includes(assigner.role);
        await Notification.create({
          user_id: assignerId,
          message: `${reviewer ? reviewer.name : 'A reviewer'} has submitted their assigned review${isGrouped ? 's' : ''}.`,
          link: isReviewTableMgr ? '/review-table' : '/',
          entity_type: 'review',
          entity_id: lockedTask.id
        }, { transaction: t });
      }

      return {
        isDuplicate: false,
        message: isGrouped ? 'All reviews submitted successfully' : 'Review submitted successfully'
      };
    });

    res.json(result);
  } catch (err) {
    if (err.statusCode === 400 || err.statusCode === 409) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Server error submitting review' });
  }
});

// GET /api/reviews/subordinates
// Manager fetches completed reviews for direct reports
router.get('/subordinates', auth, async (req, res) => {
  try {
    if (!['team_manager', 'department_manager', 'company_manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find all direct subordinates
    const subordinates = await User.findAll({
      where: { manager_id: req.user.id },
      attributes: ['id']
    });

    const subordinateIds = subordinates.map(sub => sub.id);

    // Fetch reviews where the reviewee is a direct subordinate
    const reviews = await Review.findAll({
      where: {
        reviewee_id: subordinateIds
      },
      include: [
        { model: Task, attributes: ['id', 'type', 'feedback_type', 'quarter', 'year'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'role', 'team', 'department'] },
        { model: User, as: 'reviewee', attributes: ['id', 'name', 'role', 'team', 'department'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching subordinate reviews:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
