const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// GET /api/notifications
// Fetch all notifications for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
});

// PUT /api/notifications/mark-all-read & PUT /api/notifications/read-all
// Mark all existing unread notifications for authenticated user as read
const handleMarkAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Determine cutoff timestamp: defaults to current server time or client-provided timestamp
    let cutoffDate = new Date();
    if (req.body && req.body.before) {
      const parsed = new Date(req.body.before);
      if (!isNaN(parsed.getTime())) {
        cutoffDate = parsed;
      }
    }

    const [updatedCount] = await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: userId,
          is_read: false,
          createdAt: {
            [Op.lte]: cutoffDate
          }
        }
      }
    );

    res.json({
      message: 'All notifications marked as read',
      updatedCount,
      cutoff: cutoffDate.toISOString()
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err.message);
    res.status(500).json({ message: 'Server error marking notifications as read' });
  }
};

router.put('/mark-all-read', auth, handleMarkAllRead);
router.put('/read-all', auth, handleMarkAllRead);

// PUT /api/notifications/:id/read
// Mark a single notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (!notifId || isNaN(notifId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOne({
      where: { id: notifId, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.is_read) {
      notification.is_read = true;
      await notification.save();
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

module.exports = router;

