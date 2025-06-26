const express = require('express');
const Notification = require('../models/Notification');
const { verifyToken } = require('./auth');

const router = express.Router();

// Get all notifications for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Helper: Create a notification (for backend use)
router.post('/', async (req, res) => {
  try {
    const { user, type, message, data } = req.body;
    const notification = new Notification({ user, type, message, data });
    await notification.save();
    res.status(201).json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

module.exports = router; 