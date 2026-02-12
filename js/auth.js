// Authentication Module for SecurePass Pro

class Auth {
    constructor() {
        this.baseUrl = 'http://localhost:5001/api';
        this.token = localStorage.getItem('securepass_token');
        this.user = JSON.parse(localStorage.getItem('securepass_user')) || null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });

            // Password strength checker
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => {
                    this.checkPasswordStrength(e.target.value);
                });
            }

            // Password match checker
            const confirmPassword = document.getElementById('confirm_password');
            if (confirmPassword) {
                confirmPassword.addEventListener('input', (e) => {
                    this.checkPasswordMatch();
                });
            }
        }

        // Toggle password visibility
        const toggleButtons = document.querySelectorAll('#togglePassword');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e.target);
            });
        });

        // Avatar upload (profile photo) on dashboard
        const avatarTrigger = document.getElementById('avatarUploadTrigger');
        const avatarInput = document.getElementById('avatarFileInput');
        const avatarRemove = document.getElementById('avatarRemoveBtn');
        if (avatarTrigger && avatarInput) {
            avatarTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                avatarInput.click();
            });
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const dataUrl = evt.target.result;
                    try {
                        localStorage.setItem('taskvora_avatar', dataUrl);
                    } catch (_) {
                        // ignore quota issues
                    }
                    const circle = document.getElementById('avatarCircle');
                    const initialsSpan = document.getElementById('avatarInitials');
                    if (circle && dataUrl) {
                        circle.style.backgroundImage = `url(${dataUrl})`;
                    }
                    if (initialsSpan) {
                        initialsSpan.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        if (avatarRemove) {
            avatarRemove.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    localStorage.removeItem('taskvora_avatar');
                } catch (_) {}
                const circle = document.getElementById('avatarCircle');
                const initialsSpan = document.getElementById('avatarInitials');
                if (circle) {
                    circle.style.backgroundImage = '';
                }
                if (initialsSpan) {
                    initialsSpan.style.display = '';
                }
            });
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Basic validation
        if (!email || !password) {
            this.showMessage('Please fill in all fields.', 'danger');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Clear all existing data to ensure clean state for new user
                localStorage.clear();

                // Save token and user data
                this.token = data.token;
                this.user = data.user;

                localStorage.setItem('securepass_token', data.token);
                localStorage.setItem('securepass_user', JSON.stringify(data.user));

                // Instant redirect to dashboard, no delay and no server-failed message
                window.location.href = 'dashboard.html';
            } else {
                // Generic, short error (no "server failed" wording)
                this.showMessage(data.message || 'Please try again.', 'danger');
            }

        } catch (error) {
            console.error('Login error:', error);
            // Silent on server issues (no "server connection failed" message)
            this.showMessage('Please try again in a moment.', 'danger');
        }
    }

    async register() {
        const employee_id = document.getElementById('employee_id').value;
        const full_name = document.getElementById('full_name').value;
        const email = document.getElementById('email').value;
        const department = document.getElementById('department').value;
        const password = document.getElementById('password').value;
        const confirm_password = document.getElementById('confirm_password').value;
        const role = document.getElementById('role').value;
        const terms = document.getElementById('terms').checked;

        // Validate inputs
        if (!employee_id || !full_name || !email || !department || !password || !confirm_password) {
            this.showMessage('Please fill in all required fields', 'danger');
            return;
        }

        if (!terms) {
            this.showMessage('You must agree to the terms and conditions', 'danger');
            return;
        }

        if (password !== confirm_password) {
            this.showMessage('Passwords do not match', 'danger');
            return;
        }

        // Password strength validation
        if (!this.isPasswordStrong(password)) {
            this.showMessage('Password must be at least 8 characters with mix of letters, numbers and symbols.', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employee_id,
                    full_name,
                    email,
                    department,
                    password,
                    role
                })
            });

            const data = await response.json();

            if (data.success) {
                // Clear any existing auth data to ensure clean state for new user
                localStorage.removeItem('securepass_token');
                localStorage.removeItem('securepass_user');

                // If backend returns token + user, use them directly
                if (data.token && data.user) {
                    this.token = data.token;
                    this.user = data.user;

                    localStorage.setItem('securepass_token', data.token);
                    localStorage.setItem('securepass_user', JSON.stringify(data.user));

                    window.location.href = 'dashboard.html';
                } else {
                    // Fallback: registration ok, send user to login silently
                    window.location.href = 'login.html';
                }
            } else {
                this.showMessage(data.message || 'Please try again.', 'danger');
            }

        } catch (error) {
            console.error('Registration error:', error);
            // Silent on server issues (no "server connection failed" message)
            this.showMessage('Please try again in a moment.', 'danger');
        }
    }

    logout() {
        // Clear local storage
        localStorage.removeItem('securepass_token');
        localStorage.removeItem('securepass_user');
        localStorage.removeItem('securepass_last_login');
        
        // Clear token and user
        this.token = null;
        this.user = null;
        
        // Redirect to login
        window.location.href = 'login.html';
    }

    checkAuthState() {
        // If on protected page and not logged in, redirect to login
        const protectedPages = ['dashboard.html', 'profile.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage) && !this.token) {
            window.location.href = 'login.html';
            return;
        }

        // If on login/register page and already logged in, redirect to dashboard
        const authPages = ['login.html', 'register.html', 'index.html'];
        if (authPages.includes(currentPage) && this.token) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Update UI if user is logged in
        if (this.user) {
            this.updateUserUI();
        }
    }

    updateUserUI() {
        // Update user name in navbar
        const userNameElements = document.querySelectorAll('#userName, #userFullName');
        userNameElements.forEach(el => {
            if (this.user && this.user.full_name) {
                el.textContent = this.user.full_name;
            }
        });

        // Update user role
        const userRoleElements = document.querySelectorAll('#userRole');
        userRoleElements.forEach(el => {
            if (this.user && this.user.role) {
                el.textContent = this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1);
            }
        });

        // Update user department
        const userDeptElements = document.querySelectorAll('#userDept');
        userDeptElements.forEach(el => {
            if (this.user && this.user.department) {
                el.textContent = this.user.department;
            }
        });

        // Update avatar (photo or initials)
        const avatarCircle = document.getElementById('avatarCircle');
        const avatarInitials = document.getElementById('avatarInitials');
        const storedAvatar = localStorage.getItem('taskvora_avatar');

        if (avatarCircle && storedAvatar) {
            avatarCircle.style.backgroundImage = `url(${storedAvatar})`;
            if (avatarInitials) avatarInitials.style.display = 'none';
        } else if (avatarInitials && this.user && this.user.full_name) {
            const initials = this.user.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            avatarInitials.textContent = initials;
            if (avatarCircle) avatarCircle.style.backgroundImage = '';
            avatarInitials.style.display = '';
        }

        // Update last login
        const lastLogin = document.getElementById('lastLogin');
        if (lastLogin) {
            const lastLoginTime = localStorage.getItem('securepass_last_login');
            if (lastLoginTime) {
                lastLogin.textContent = new Date(lastLoginTime).toLocaleString();
            } else {
                lastLogin.textContent = 'First login';
                localStorage.setItem('securepass_last_login', new Date().toISOString());
            }
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.getElementById('passwordStrength');
        const hint = document.getElementById('passwordHint');
        
        if (!strengthBar) return;

        let strength = 0;
        let message = '';
        let color = '';

        // Length check
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;

        // Complexity checks
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;

        // Cap at 100
        strength = Math.min(strength, 100);

        // Set message and color
        if (strength < 40) {
            message = 'Weak password';
            color = 'bg-danger';
        } else if (strength < 70) {
            message = 'Medium password';
            color = 'bg-warning';
        } else if (strength < 90) {
            message = 'Strong password';
            color = 'bg-info';
        } else {
            message = 'Very strong password';
            color = 'bg-success';
        }

        // Update UI
        strengthBar.style.width = `${strength}%`;
        strengthBar.className = `progress-bar ${color}`;
        
        if (hint) {
            hint.textContent = message;
            hint.className = strength < 70 ? 'text-danger' : 'text-success';
        }
    }

    checkPasswordMatch() {
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;
        const matchDiv = document.getElementById('passwordMatch');
        
        if (!matchDiv) return;

        if (!password || !confirm) {
            matchDiv.innerHTML = '';
            return;
        }

        if (password === confirm) {
            matchDiv.innerHTML = '<small class="text-success"><i class="fas fa-check me-1"></i>Passwords match</small>';
        } else {
            matchDiv.innerHTML = '<small class="text-danger"><i class="fas fa-times me-1"></i>Passwords do not match</small>';
        }
    }

    isPasswordStrong(password) {
        // At least 8 characters
        if (password.length < 8) return false;
        
        // Contains uppercase, lowercase, number, and special character
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
        return hasUpper && hasLower && hasNumber && hasSpecial;
    }

    togglePasswordVisibility(button) {
        const icon = button.querySelector('i');
        const passwordInput = button.closest('.input-group').querySelector('input[type="password"]');
        
        if (!passwordInput) return;

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    showMessage(text, type) {
        // Remove existing messages
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type} alert-dismissible fade show`;
        messageDiv.innerHTML = `
            ${text}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        const container = document.getElementById('message') || document.querySelector('.container');
        if (document.getElementById('message')) {
            document.getElementById('message').innerHTML = messageDiv.innerHTML;
            document.getElementById('message').classList.remove('d-none');
        } else {
            container.prepend(messageDiv);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
            if (document.getElementById('message')) {
                document.getElementById('message').classList.add('d-none');
            }
        }, 5000);
    }

    showLoading(text = 'Loading...') {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p class="mt-3">${text}</p>
            </div>
        `;

        // Add styles if not already added
        if (!document.querySelector('#loadingStyles')) {
            const styles = document.createElement('style');
            styles.id = 'loadingStyles';
            styles.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    color: white;
                }
                .spinner-container {
                    text-align: center;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #4361ee;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // API request helper
    async apiRequest(endpoint, options = {}) {
        if (!this.token) {
            this.showMessage('Please login first', 'warning');
            return null;
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        try {
            const url = endpoint.includes('?') ? `${this.baseUrl}${endpoint}&t=${Date.now()}` : `${this.baseUrl}${endpoint}?t=${Date.now()}`;
            const response = await fetch(url, {
                ...defaultOptions,
                ...options
            });

            // If unauthorized, logout
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            // Keep this generic, no explicit "server connection" wording
            this.showMessage('Something went wrong. Please try again.', 'danger');
            return null;
        }
    }
}

// Initialize auth module
window.auth = new Auth();

// Setup logout button
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.auth.logout();
        });
    }
});