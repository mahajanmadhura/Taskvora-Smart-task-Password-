const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});

// Routes
router.get('/', auth, fileController.getUploadedFiles);
router.post('/upload', auth, upload.single('excelFile'), fileController.uploadFile);
router.get('/:id/download', auth, fileController.downloadFile);
router.get('/:id/view', auth, fileController.viewFile);
router.delete('/:id', auth, fileController.deleteFile);

module.exports = router;
