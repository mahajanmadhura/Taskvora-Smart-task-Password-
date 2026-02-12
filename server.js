require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database
const db = require('./database');
const { sendDailyNotifications } = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'SecurePass Pro',
        version: '1.0.0'
    });
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 5001; // Changed port to avoid conflict

async function startServer() {
    try {
        await db.init(); // Initialize database asynchronously
        app.listen(PORT, () => {
            console.log(`
    🚀 SecurePass Pro Server Started!
    📍 Port: ${PORT}
    🔗 API: http://localhost:${PORT}/api
    🖥️  Frontend: http://localhost:${PORT}
            `);
        });

        // Schedule daily notification emails for expiring passwords and upcoming reminders
        // Runs once a day while the server is running.
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        setInterval(() => {
            sendDailyNotifications(3).catch(err => {
                console.error('Notification job failed:', err.message);
            });
        }, ONE_DAY_MS);

        // Also run once shortly after startup so user doesn't have to wait a full day
        setTimeout(() => {
            sendDailyNotifications(3).catch(err => {
                console.error('Initial notification job failed:', err.message);
            });
        }, 60 * 1000);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down server...');
    try {
        await db.close();
        console.log('✅ Database closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing database:', error);
        process.exit(1);
    }
});

startServer();
