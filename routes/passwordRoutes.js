const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Password routes
router.post('/', passwordController.addPassword);
router.get('/', passwordController.getPasswords);
router.get('/expiring', passwordController.getExpiringPasswords);
router.put('/:id', passwordController.updatePassword);
router.delete('/:id', passwordController.deletePassword);

module.exports = router;