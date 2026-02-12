const db = require('../database');
const moment = require('moment');

class ReminderController {
    async addReminder(req, res) {
        try {
            const userId = req.user.id;
            const reminderData = req.body;

            // Validate reminder date
            const reminderDate = moment(reminderData.reminder_date);
            if (!reminderDate.isValid() || reminderDate.isBefore(moment())) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid reminder date' 
                });
            }

            await db.addReminder(userId, reminderData);

            res.status(201).json({ 
                success: true, 
                message: 'Reminder added successfully' 
            });

        } catch (error) {
            console.error('Add reminder error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to add reminder' 
            });
        }
    }

    async getReminders(req, res) {
        try {
            const userId = req.user.id;
            const reminders = await db.getReminders(userId);

            // Calculate days left and status
            const remindersWithStatus = reminders.map(reminder => {
                const daysLeft = moment(reminder.reminder_date).diff(moment(), 'days');
                let status = 'upcoming';
                
                if (daysLeft < 0 && !reminder.is_completed) {
                    status = 'overdue';
                } else if (daysLeft <= 0) {
                    status = 'today';
                } else if (daysLeft <= 3) {
                    status = 'soon';
                }

                return {
                    ...reminder,
                    days_left: daysLeft,
                    status: status
                };
            });

            res.json({ 
                success: true, 
                reminders: remindersWithStatus 
            });

        } catch (error) {
            console.error('Get reminders error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch reminders' 
            });
        }
    }

    async getUpcomingReminders(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 7;
            
            const reminders = await db.getReminders(userId);
            const upcomingReminders = reminders.filter(reminder => {
                const daysLeft = moment(reminder.reminder_date).diff(moment(), 'days');
                return daysLeft >= 0 && daysLeft <= days && !reminder.is_completed;
            });

            res.json({ 
                success: true, 
                reminders: upcomingReminders,
                count: upcomingReminders.length 
            });

        } catch (error) {
            console.error('Upcoming reminders error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch upcoming reminders' 
            });
        }
    }

    async markComplete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            // Check if reminder belongs to user
            const existing = await db.get(
                'SELECT * FROM reminders WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (!existing) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Reminder not found' 
                });
            }

            await db.run(
                'UPDATE reminders SET is_completed = 1, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );

            res.json({ 
                success: true, 
                message: 'Reminder marked as complete' 
            });

        } catch (error) {
            console.error('Mark complete error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update reminder' 
            });
        }
    }

    async deleteReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await db.run(
                'DELETE FROM reminders WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (result.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Reminder not found' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Reminder deleted successfully' 
            });

        } catch (error) {
            console.error('Delete reminder error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete reminder' 
            });
        }
    }
}

module.exports = new ReminderController();