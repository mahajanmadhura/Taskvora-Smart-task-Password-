const cron = require('node-cron');
const db = require('../database');
const emailService = require('./emailService');

const startCronJobs = () => {
    // Check for expiring passwords every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('🔄 Checking for expiring passwords...');

        try {
            // Get passwords expiring in next 3 days
            const expiringPasswords = await db.getExpiringPasswords(3);
            
            // Get passwords expiring in next 1 day
            const criticalPasswords = await db.getExpiringPasswords(1);
            
            // Send notifications
            for (const password of expiringPasswords) {
                const daysLeft = Math.ceil(
                    (new Date(password.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                
                const subject = `🔔 Password Expiry Reminder: ${password.app_name}`;
                const message = `
                    Hello ${password.full_name},<br><br>
                    
                    Your password for <b>${password.app_name}</b> will expire in 
                    <b>${daysLeft} day(s)</b> on ${new Date(password.expiry_date).toLocaleDateString()}.<br><br>
                    
                    Please update your password before it expires.<br><br>
                    
                    Regards,<br>
                    SecurePass Pro Team
                `;
                
                await emailService.sendEmail(password.email, subject, message);
            }
            
            console.log(`✅ Sent ${expiringPasswords.length} expiry reminders`);
            
        } catch (error) {
            console.error('❌ Cron job error:', error);
        }
    });

    // Check for upcoming reminders every day at 10 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('🔄 Checking for upcoming reminders...');
        
        try {
            // Get reminders due in next 3 days
            const upcomingReminders = await db.getUpcomingReminders(3);
            
            // Send notifications
            for (const reminder of upcomingReminders) {
                const daysLeft = Math.ceil(
                    (new Date(reminder.reminder_date) - new Date()) / (1000 * 60 * 60 * 24)
                );
                
                const subject = `📅 Reminder: ${reminder.title}`;
                const message = `
                    Hello ${reminder.full_name},<br><br>
                    
                    This is a reminder for: <b>${reminder.title}</b><br><br>
                    
                    ${reminder.description ? `Details: ${reminder.description}<br><br>` : ''}
                    Due in: <b>${daysLeft} day(s)</b><br>
                    Due Date: ${new Date(reminder.reminder_date).toLocaleDateString()}<br><br>
                    
                    Regards,<br>
                    SecurePass Pro Team
                `;
                
                await emailService.sendEmail(reminder.email, subject, message);
            }
            
            console.log(`✅ Sent ${upcomingReminders.length} reminder notifications`);
            
        } catch (error) {
            console.error('❌ Cron job error:', error);
        }
    });

    console.log('✅ Cron jobs scheduled');
};

module.exports = { startCronJobs };