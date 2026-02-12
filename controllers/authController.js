const db = require('../database');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class AuthController {
    async register(req, res) {
        try {
            const { employee_id, full_name, email, department, password, role } = req.body;

            // Check if user exists
            const existingUser = await db.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists. Please use a different email.'
                });
            }

            // Check if employee_id exists
            const existingEmployee = await db.get('SELECT * FROM users WHERE employee_id = ?', [employee_id]);
            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID already exists. Please use a different Employee ID.'
                });
            }

            // Create user
            await db.createUser({
                employee_id,
                full_name,
                email,
                department,
                password,
                role
            });

            res.status(201).json({ 
                success: true, 
                message: 'User registered successfully' 
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Registration failed' 
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Verify user
            const user = await db.verifyUser(email, password);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role,
                    employee_id: user.employee_id 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ 
                success: true, 
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    employee_id: user.employee_id,
                    full_name: user.full_name,
                    email: user.email,
                    department: user.department,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Login failed' 
            });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await db.get('SELECT id, employee_id, full_name, email, department, role FROM users WHERE id = ?', [userId]);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            res.json({ 
                success: true, 
                user 
            });

        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch profile' 
            });
        }
    }
}

module.exports = new AuthController();