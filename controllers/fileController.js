const db = require('../database');
const path = require('path');
const fs = require('fs').promises;

// Get uploaded files for user
exports.getUploadedFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await db.all('SELECT * FROM uploaded_files WHERE user_id = ? ORDER BY uploaded_at DESC', [userId]);
        res.json({ success: true, files });
    } catch (error) {
        console.error('Get uploaded files error:', error);
        res.status(500).json({ error: 'Failed to get uploaded files' });
    }
};

// Upload Excel file
exports.uploadFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type (Excel files)
        const allowedTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel.sheet.macroEnabled.12'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ error: 'Only Excel files are allowed' });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const filename = `${timestamp}_${originalName}`;
        const filepath = path.join(__dirname, '../../uploads', filename);

        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../../uploads');
        try {
            await fs.access(uploadsDir);
        } catch {
            await fs.mkdir(uploadsDir, { recursive: true });
        }

        // Move file to uploads directory
        await fs.writeFile(filepath, file.buffer);

        // Save to database
        const result = await db.run(
            'INSERT INTO uploaded_files (user_id, filename, filepath) VALUES (?, ?, ?)',
            [userId, originalName, filepath]
        );

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                id: result.lastID,
                filename: originalName,
                uploaded_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

// Download/view Excel file
exports.downloadFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const file = await db.get('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file exists on disk
        try {
            await fs.access(file.filepath);
        } catch {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Set headers for download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);

        // Stream file
        const fileStream = require('fs').createReadStream(file.filepath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
};

// View Excel file inline
exports.viewFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const file = await db.get('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if file exists on disk
        try {
            await fs.access(file.filepath);
        } catch {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        // Set headers for inline viewing
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

        // Stream file
        const fileStream = require('fs').createReadStream(file.filepath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('View file error:', error);
        res.status(500).json({ error: 'Failed to view file' });
    }
};

// Delete uploaded file
exports.deleteFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const file = await db.get('SELECT * FROM uploaded_files WHERE id = ? AND user_id = ?', [fileId, userId]);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from disk
        try {
            await fs.unlink(file.filepath);
        } catch (err) {
            console.warn('Failed to delete file from disk:', err);
        }

        // Delete from database
        await db.run('DELETE FROM uploaded_files WHERE id = ?', [fileId]);

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};
