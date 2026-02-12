const db = require('../database');
const { sendNotificationToUser } = require('../services/notificationService');

// Get email count for user
async function getEmailCount(req, res) {
    try {
        const userId = req.user.id;
        const count = await db.get('SELECT COUNT(*) as count FROM email_logs WHERE user_id = ?', [userId]);
        res.json({ count: count.count || 0 });
    } catch (error) {
        console.error('Get email count error:', error);
        res.status(500).json({ error: 'Failed to get email count' });
    }
}

async function sendNow(req, res) {
    try {
        const userId = req.user.id;
        await sendNotificationToUser(userId, 3);
        // Log the email sent
        await db.run('INSERT INTO email_logs (user_id, email_type) VALUES (?, ?)', [userId, 'notification']);
        res.json({ success: true, message: 'Notification email sent to your registered email.' });
    } catch (error) {
        console.error('Send notification error:', error);
        let message = 'Failed to send notification email';
        if (error && typeof error.message === 'string') {
            const msg = error.message.toLowerCase();
            if (msg.includes('invalid login') || msg.includes('username and password not accepted')) {
                message = 'Email service is not configured correctly. Please contact your administrator to set up Taskvora email.';
            }
        }
        res.status(500).json({
            success: false,
            message
        });
    }
}

module.exports = { getEmailCount, sendNow };
