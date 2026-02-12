const db = require('../database');
const moment = require('moment');

class PasswordController {
    async addPassword(req, res) {
        try {
            const userId = req.user.id;
            const passwordData = req.body;

            // Default expiry to 1 year from now if not provided or invalid
            let expiryDate = moment(passwordData.expiry_date);
            if (!expiryDate.isValid() || expiryDate.isBefore(moment())) {
                passwordData.expiry_date = moment().add(1, 'year').format('YYYY-MM-DD');
            }
            if (!passwordData.website_url) passwordData.website_url = '';
            if (passwordData.notes == null) passwordData.notes = '';

            await db.addPassword(userId, passwordData);

            res.status(201).json({ 
                success: true, 
                message: 'Password added successfully' 
            });

        } catch (error) {
            console.error('Add password error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to add password' 
            });
        }
    }

    async getPasswords(req, res) {
        try {
            const userId = req.user.id;
            const passwords = await db.getPasswords(userId);

            // Calculate days left for each password
            const passwordsWithStatus = passwords.map(pwd => {
                const daysLeft = moment(pwd.expiry_date).diff(moment(), 'days');
                let status = 'safe';
                
                if (daysLeft <= 0) {
                    status = 'expired';
                } else if (daysLeft <= 7) {
                    status = 'warning';
                } else if (daysLeft <= 30) {
                    status = 'info';
                }

                return {
                    ...pwd,
                    days_left: daysLeft,
                    status: status
                };
            });

            res.json({ 
                success: true, 
                passwords: passwordsWithStatus 
            });

        } catch (error) {
            console.error('Get passwords error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch passwords' 
            });
        }
    }

    async getExpiringPasswords(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 7;
            
            const passwords = await db.getPasswords(userId);
            const expiringPasswords = passwords.filter(pwd => {
                const daysLeft = moment(pwd.expiry_date).diff(moment(), 'days');
                return daysLeft >= 0 && daysLeft <= days;
            });

            res.json({ 
                success: true, 
                passwords: expiringPasswords,
                count: expiringPasswords.length 
            });

        } catch (error) {
            console.error('Expiring passwords error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch expiring passwords' 
            });
        }
    }

    async updatePassword(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;

            // Check if password belongs to user
            const existing = await db.get(
                'SELECT * FROM app_passwords WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (!existing) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Password not found' 
                });
            }

            // Update password
            const encryptedPassword = db.encryptPassword(updateData.password);
            
            await db.run(
                `UPDATE app_passwords 
                 SET app_name = ?, website_url = ?, username = ?, 
                     encrypted_password = ?, expiry_date = ?, 
                     days_before_reminder = ?, category = ?, notes = ?
                 WHERE id = ? AND user_id = ?`,
                [updateData.app_name, updateData.website_url, updateData.username,
                 encryptedPassword, updateData.expiry_date, 
                 updateData.days_before_reminder || 7, updateData.category,
                 updateData.notes, id, userId]
            );

            res.json({ 
                success: true, 
                message: 'Password updated successfully' 
            });

        } catch (error) {
            console.error('Update password error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update password' 
            });
        }
    }

    async deletePassword(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await db.run(
                'DELETE FROM app_passwords WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (result.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Password not found' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Password deleted successfully' 
            });

        } catch (error) {
            console.error('Delete password error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete password' 
            });
        }
    }
}

module.exports = new PasswordController();