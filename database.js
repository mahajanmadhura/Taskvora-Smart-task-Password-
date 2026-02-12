const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here';

class Database {
    constructor() {
        this.db = new sqlite3.Database(
            path.join(__dirname, 'database', 'securepass_new.db'),
            (err) => {
                if (err) {
                    console.error('❌ Database error:', err.message);
                } else {
                    console.log('✅ Connected to SQLite database');
                }
            }
        );
    }

    async init() {
        // Ensure database directory exists
        const dbDir = path.dirname(this.db.filename);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Run initialization SQL
        await this.runInitSQL();

        // Create admin user
        await this.createAdminUser();
    }

    async runInitSQL() {
        try {
            const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
            // Remove comments and split by semicolon
            const cleanSQL = initSQL
                .split('\n')
                .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
                .join('\n');

            const statements = cleanSQL.split(';').filter(stmt => stmt.trim().length > 0);

            for (const statement of statements) {
                if (statement.trim()) {
                    await this.run(statement.trim());
                }
            }
            console.log('✅ Database tables initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }


  


    async createAdminUser() {
        const adminData = {
            employee_id: 'ADMIN001',
            full_name: 'System Admin',
            email: 'admin@company.com',
            department: 'IT',
            password: 'Admin@123',
            role: 'admin'
        };

        const existing = await this.getUserByEmail(adminData.email);
        if (!existing) {
            const hashedPassword = await bcrypt.hash(adminData.password, 10);
            await this.run(
                `INSERT INTO users (employee_id, full_name, email, department, password_hash, role)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [adminData.employee_id, adminData.full_name, adminData.email,
                 adminData.department, hashedPassword, adminData.role]
            );
            console.log('✅ Admin user created');
        }
    }

    // Encryption/Decryption methods
    encryptPassword(password) {
        return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
    }

    decryptPassword(encryptedPassword) {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    // User methods
    async createUser(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 4);
        return this.run(
            `INSERT INTO users (employee_id, full_name, email, department, password_hash, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userData.employee_id, userData.full_name, userData.email, 
             userData.department, hashedPassword, userData.role || 'employee']
        );
    }

    async getUserByEmail(email) {
        return this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async getUserById(id) {
        return this.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    async verifyUser(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return null;

        // Check if password needs rehashing (if cost is 10, 8, or 6, rehash to 4)
        const hashParts = user.password_hash.split('$');
        if (hashParts.length >= 4 && (hashParts[2] === '10' || hashParts[2] === '08' || hashParts[2] === '06')) {
            const newHash = await bcrypt.hash(password, 4);
            await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
            console.log(`✅ Rehashed password for user ${user.email}`);
        }

        return user;
    }

    // Password methods
    async addPassword(userId, passwordData) {
        const encryptedPassword = this.encryptPassword(passwordData.password);
        
        return this.run(
            `INSERT INTO app_passwords 
             (user_id, app_name, website_url, username, encrypted_password, expiry_date, 
              days_before_reminder, category, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, passwordData.app_name, passwordData.website_url, 
             passwordData.username, encryptedPassword, passwordData.expiry_date,
             passwordData.days_before_reminder || 7, passwordData.category, 
             passwordData.notes]
        );
    }

    async getPasswords(userId) {
        const passwords = await this.all(
            `SELECT id, app_name, website_url, username, encrypted_password, 
                    expiry_date, days_before_reminder, category, notes, created_at
             FROM app_passwords 
             WHERE user_id = ? 
             ORDER BY expiry_date ASC`,
            [userId]
        );

        // Decrypt passwords for display
        return passwords.map(pwd => ({
            ...pwd,
            password: this.decryptPassword(pwd.encrypted_password)
        }));
    }

    async getExpiringPasswords(days = 7) {
        const query = `
            SELECT ap.*, u.email, u.full_name
            FROM app_passwords ap
            JOIN users u ON ap.user_id = u.id
            WHERE DATE(ap.expiry_date) <= DATE('now', ? || ' days')
              AND DATE(ap.expiry_date) >= DATE('now')
            ORDER BY ap.expiry_date ASC
        `;
        return this.all(query, [`+${days}`]);
    }

    // Reminder methods
    async addReminder(userId, reminderData) {
        return this.run(
            `INSERT INTO reminders 
             (user_id, title, description, reminder_date, priority, category) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, reminderData.title, reminderData.description, 
             reminderData.reminder_date, reminderData.priority || 'medium', 
             reminderData.category]
        );
    }

    async getReminders(userId) {
        return this.all(
            `SELECT * FROM reminders 
             WHERE user_id = ? 
             ORDER BY reminder_date ASC`,
            [userId]
        );
    }

    async getUpcomingReminders(days = 7) {
        return this.all(
            `SELECT r.*, u.email, u.full_name
             FROM reminders r
             JOIN users u ON r.user_id = u.id
             WHERE DATE(r.reminder_date) <= DATE('now', ? || ' days')
               AND DATE(r.reminder_date) >= DATE('now')
               AND r.is_completed = 0
             ORDER BY r.reminder_date ASC`,
            [`+${days}`]
        );
    }

    // Database helper methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();
