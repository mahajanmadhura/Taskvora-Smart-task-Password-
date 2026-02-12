const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Reminder routes
router.post('/', reminderController.addReminder);
router.get('/', reminderController.getReminders);
router.get('/upcoming', reminderController.getUpcomingReminders);
router.put('/:id/complete', reminderController.markComplete);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;