const nodemailer = require('nodemailer');

// Configure transporter using environment variables so user can plug in real SMTP
// For example, in .env:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=your_email@example.com
// SMTP_PASS=your_app_password
// SMTP_FROM="SecurePass Pro" <no-reply@yourdomain.com>

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'your_email@gmail.com',
        pass: process.env.SMTP_PASS || 'your_app_password'
    }
});

async function sendEmail(to, subject, text) {
    const from = process.env.SMTP_FROM || 'SecurePass Pro <no-reply@securepass-pro.local>';

    // Check if email is configured (not using default values)
    const isConfigured = process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com' &&
                        process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your_app_password';

    if (!isConfigured) {
        // Simulate email sending for demo purposes
        console.log('📧 [DEMO MODE] Email would be sent:');
        console.log(`From: ${from}`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text}`);
        console.log('--- End of simulated email ---');
        return; // Don't throw error, just log
    }

    try {
        await transporter.sendMail({
            from,
            to,
            subject,
            text
        });
    } catch (err) {
        console.error('Email send failed:', err.message);
        // Don't throw error, just log it for demo purposes
    }
}

module.exports = { sendEmail };

