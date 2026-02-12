const db = require('../database');
const { sendEmail } = require('./emailService');

// Build plain-text email content for a user's notifications
// User-friendly messages: password expired soon / meeting in 2-3 days - Be Ready
function buildEmailContent({ fullName, passwordItems, reminderItems, daysAhead }) {
    let lines = [];

    lines.push(`Hi ${fullName || 'there'},`);
    lines.push('');

    if (passwordItems.length > 0) {
        lines.push(`Your password is expiring soon – please change it.`);
        lines.push('');
        lines.push(`The following passwords will expire in the next ${daysAhead} day(s):`);
        passwordItems.forEach(item => {
            const expDate = new Date(item.expiry_date);
            const today = new Date();
            const diffDays = Math.max(
                0,
                Math.ceil((expDate.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
            );
            const dateText = expDate.toLocaleDateString();
            const daysText = diffDays === 0 ? 'today' : `in ${diffDays} day(s)`;
            lines.push(`• ${item.app_name} (${item.username}) – expires ${dateText} (${daysText})`);
        });
        lines.push('');
        lines.push(`Please update these passwords in Taskvora to keep your accounts secure.`);
        lines.push('');
    }

    if (reminderItems.length > 0) {
        lines.push(`Your meeting / task is in the next ${daysAhead} day(s) – Be Ready.`);
        lines.push('');
        reminderItems.forEach(item => {
            const remDate = new Date(item.reminder_date);
            const today = new Date();
            const diffDays = Math.max(
                0,
                Math.ceil((remDate.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
            );
            const dateText = remDate.toLocaleDateString();
            const daysText = diffDays === 0 ? 'today' : `in ${diffDays} day(s)`;
            lines.push(`• ${item.title} – ${dateText} (${daysText})`);
        });
        lines.push('');
        lines.push(`Be prepared. Open your Taskvora dashboard to view details.`);
        lines.push('');
    }

    lines.push(`— Taskvora`);
    return lines.join('\n');
}

async function sendDailyNotifications(daysAhead = 3) {
    // Fetch items with joined user info
    const expiringPasswords = await db.getExpiringPasswords(daysAhead);
    const upcomingReminders = await db.getUpcomingReminders(daysAhead);

    // Group by user email
    const userMap = new Map();

    for (const pwd of expiringPasswords) {
        if (!pwd.email) continue;
        const key = pwd.email;
        if (!userMap.has(key)) {
            userMap.set(key, {
                fullName: pwd.full_name,
                email: pwd.email,
                passwords: [],
                reminders: []
            });
        }
        userMap.get(key).passwords.push(pwd);
    }

    for (const rem of upcomingReminders) {
        if (!rem.email) continue;
        const key = rem.email;
        if (!userMap.has(key)) {
            userMap.set(key, {
                fullName: rem.full_name,
                email: rem.email,
                passwords: [],
                reminders: []
            });
        }
        userMap.get(key).reminders.push(rem);
    }

    // Send one email per user if they have any items
    for (const [, userData] of userMap.entries()) {
        const { fullName, email, passwords, reminders } = userData;
        if (passwords.length === 0 && reminders.length === 0) continue;

        let subject;
        if (passwords.length > 0 && reminders.length === 0) {
            subject = 'Your password is expiring soon – please change it';
        } else if (reminders.length > 0 && passwords.length === 0) {
            subject = 'Your meeting in 2–3 days – Be Ready';
        } else {
            subject = 'Taskvora – Password expiring soon & meeting in 2–3 days – Be Ready';
        }

        const text = buildEmailContent({
            fullName,
            passwordItems: passwords,
            reminderItems: reminders,
            daysAhead
        });

        try {
            await sendEmail(email, subject, text);
            console.log(`📧 Notification email sent to ${email}`);
        } catch (err) {
            console.error(`Failed to send email to ${email}:`, err.message);
        }
    }
}

/** Send notification email to a single user (e.g. "Email me now" from dashboard). */
async function sendNotificationToUser(userId, daysAhead = 3) {
    const user = await db.getUserById(userId);
    if (!user || !user.email) {
        throw new Error('User or email not found');
    }
    const expiringPasswords = (await db.getExpiringPasswords(daysAhead)).filter(p => p.user_id === userId);
    const upcomingReminders = (await db.getUpcomingReminders(daysAhead)).filter(r => r.user_id === userId);
    if (expiringPasswords.length === 0 && upcomingReminders.length === 0) {
        const text = `Hi ${user.full_name || 'there'},\n\nYou have no passwords expiring in the next ${daysAhead} days and no upcoming reminders in that period.\n\n— Taskvora`;
        await sendEmail(user.email, 'Taskvora – Your notification summary', text);
        return { sent: true, message: 'Summary email sent (no expiring items).' };
    }
    let subject;
    if (expiringPasswords.length > 0 && upcomingReminders.length === 0) {
        subject = 'Your password is expiring soon – please change it';
    } else if (upcomingReminders.length > 0 && expiringPasswords.length === 0) {
        subject = 'Your meeting in 2–3 days – Be Ready';
    } else {
        subject = 'Taskvora – Password expiring soon & meeting in 2–3 days – Be Ready';
    }
    const text = buildEmailContent({
        fullName: user.full_name,
        passwordItems: expiringPasswords,
        reminderItems: upcomingReminders,
        daysAhead
    });
    await sendEmail(user.email, subject, text);
    return { sent: true };
}

module.exports = { sendDailyNotifications, sendNotificationToUser };

