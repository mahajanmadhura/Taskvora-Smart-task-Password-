const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
router.get('/email-count', notificationController.getEmailCount);
router.post('/send-now', notificationController.sendNow);

module.exports = router;
