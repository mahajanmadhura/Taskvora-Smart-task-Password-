// Dashboard UI helper for SecurePass Pro
// Provides shared UI features used by both password and reminder modules
class DashboardUI {
    constructor(auth) {
        this.auth = auth;
    this.emailCount = 0;
    }

    // Simple Bootstrap-style notification in top-right corner
    showNotification(message, type = 'info') {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '320px';
            document.body.appendChild(container);
        }





        const alert = document.createElement('div');
        alert.className = `alert alert-${type} shadow-sm mb-2`;
        alert.textContent = message;

        container.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 4000);
    }

    // Internal helper to generate a strong random password string
    generateRandomPasswordValue() {
        const length = 16;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}<>?';
        let pwd = '';
        for (let i = 0; i < length; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pwd;
    }

    // Generate a strong random password and put it into the relevant input
    generatePassword(inputId) {
        const pwd = this.generateRandomPasswordValue();

        let input = null;
        if (inputId) {
            input = document.getElementById(inputId);
        }
        if (!input) {
            // Fallbacks used in existing modals
            input = document.getElementById('editPassword') || document.getElementById('newPassword');
        }

        if (input) {
            input.value = pwd;
        }
    }

    // Modal for adding a new password
    showAddPasswordModal() {
        const modalHTML = `
            <div class="modal fade" id="addPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-key me-2"></i>Add New Password
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addPasswordForm">
                                <div class="mb-3">
                                    <label class="form-label">Application Name *</label>
                                    <input type="text" class="form-control" name="app_name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Website URL</label>
                                    <input type="url" class="form-control" name="website_url">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Username *</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Password *</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" 
                                                   name="password" id="newPassword" required>
                                            <button class="btn btn-outline-secondary" type="button"
                                                    onclick="window.dashboard.generatePassword('newPassword')">
                                                <i class="fas fa-dice"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Expiry Date *</label>
                                        <input type="date" class="form-control" name="expiry_date" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Reminder Before (days)</label>
                                        <select class="form-select" name="days_before_reminder">
                                            <option value="1">1 day before</option>
                                            <option value="3">3 days before</option>
                                            <option value="7" selected>7 days before</option>
                                            <option value="14">14 days before</option>
                                            <option value="30">30 days before</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Category</label>
                                    <select class="form-select" name="category">
                                        <option value="">Select Category</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Email">Email</option>
                                        <option value="Banking">Banking</option>
                                        <option value="Work">Work</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" name="notes" rows="3"></textarea>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" name="is_favorite" id="newIsFavorite">
                                    <label class="form-check-label" for="newIsFavorite">
                                        Mark as favorite
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="savePasswordBtn">Save Password</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalElement = document.getElementById('addPasswordModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        const saveBtn = modalContainer.querySelector('#savePasswordBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.createPassword(modalContainer, modal);
            });
        }

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    async createPassword(modalContainer, modal) {
        const form = modalContainer.querySelector('#addPasswordForm');
        const formData = new FormData(form);

        const passwordData = {
            app_name: formData.get('app_name'),
            website_url: formData.get('website_url'),
            username: formData.get('username'),
            password: formData.get('password'),
            expiry_date: formData.get('expiry_date'),
            days_before_reminder: parseInt(formData.get('days_before_reminder')) || 7,
            category: formData.get('category'),
            notes: formData.get('notes'),
            is_favorite: formData.get('is_favorite') === 'on'
        };

        if (!passwordData.app_name || !passwordData.username || !passwordData.password || !passwordData.expiry_date) {
            this.showNotification('Please fill all required fields.', 'warning');
            return;
        }

        try {
            const result = await this.auth.apiRequest('/passwords', {
                method: 'POST',
                body: JSON.stringify(passwordData)
            });

            if (result?.success) {
                this.showNotification('Password added successfully.', 'success');
                modal.hide();

                if (window.passwordManager) {
                    await window.passwordManager.loadPasswords();
                    window.passwordManager.renderPasswords();
                }

                if (window.dashboard && typeof window.dashboard.refreshOverview === 'function') {
                    window.dashboard.refreshOverview();
                }


            } else {
                this.showNotification(result?.message || 'Failed to add password.', 'danger');
            }
        } catch (error) {
            console.error('Create password error:', error);
            this.showNotification('Failed to add password.', 'danger');
        }
    }

    // Simple password details modal
    showPasswordDetails(password) {
        const modalHTML = `
            <div class="modal fade" id="viewPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-key me-2"></i>${password.app_name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Username:</strong> ${password.username}</p>
                            ${password.website_url ? `<p><strong>Website:</strong> <a href="${password.website_url}" target="_blank">${password.website_url}</a></p>` : ''}
                            <p><strong>Password:</strong> <code>${password.password}</code></p>
                            ${password.notes ? `<p><strong>Notes:</strong> ${password.notes}</p>` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-primary" id="copyViewPasswordBtn">
                                <i class="fas fa-copy me-1"></i>Copy Password
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalElement = document.getElementById('viewPasswordModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        const copyBtn = modalContainer.querySelector('#copyViewPasswordBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(password.password).then(() => {
                    this.showNotification('Password copied to clipboard!', 'success');
                });
            });
        }

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    // Modal for adding a new reminder
    showAddReminderModal() {
        const modalHTML = `
            <div class="modal fade" id="addReminderModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-bell me-2"></i>Add New Reminder
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addReminderForm">
                                <div class="mb-3">
                                    <label class="form-label">Title *</label>
                                    <input type="text" class="form-control" name="title" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" name="description" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Reminder Date *</label>
                                        <input type="date" class="form-control" name="reminder_date" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Priority</label>
                                        <select class="form-select" name="priority">
                                            <option value="low">Low</option>
                                            <option value="medium" selected>Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Category</label>
                                    <select class="form-select" name="category">
                                        <option value="">Select Category</option>
                                        <option value="Work">Work Task</option>
                                        <option value="Personal">Personal</option>
                                        <option value="Security">Security</option>
                                        <option value="Meeting">Meeting</option>
                                        <option value="Deadline">Deadline</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveReminderBtn">Save Reminder</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalElement = document.getElementById('addReminderModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        const saveBtn = modalContainer.querySelector('#saveReminderBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await this.createReminder(modalContainer, modal);
            });
        }

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    async createReminder(modalContainer, modal) {
        const form = modalContainer.querySelector('#addReminderForm');
        const formData = new FormData(form);

        const reminderData = {
            title: formData.get('title'),
            description: formData.get('description'),
            reminder_date: formData.get('reminder_date'),
            priority: formData.get('priority') || 'medium',
            category: formData.get('category')
        };

        if (!reminderData.title || !reminderData.reminder_date) {
            this.showNotification('Please fill all required fields.', 'warning');
            return;
        }

        try {
            const result = await this.auth.apiRequest('/reminders', {
                method: 'POST',
                body: JSON.stringify(reminderData)
            });

            if (result?.success) {
                this.showNotification('Reminder added successfully.', 'success');
                modal.hide();

                if (window.reminderManager) {
                    await window.reminderManager.loadReminders();
                    window.reminderManager.renderReminders();
                }


            } else {
                this.showNotification(result?.message || 'Failed to add reminder.', 'danger');
            }
        } catch (error) {
            console.error('Create reminder error:', error);
            this.showNotification('Failed to add reminder.', 'danger');
        }
    }

    // Standalone password generator modal (no saving, just copy)
    showGeneratePasswordModal() {
        let generated = this.generateRandomPasswordValue();

        const modalHTML = `
            <div class="modal fade" id="generatePasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-dice me-2"></i>Generate Secure Password
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Generated Password</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="generatedPasswordField" value="${generated}" readonly>
                                    <button class="btn btn-outline-secondary" type="button" id="regenPasswordBtn">
                                        <i class="fas fa-sync"></i>
                                    </button>
                                    <button class="btn btn-outline-primary" type="button" id="copyGeneratedPasswordBtn">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                                <small class="text-muted d-block mt-2">
                                    You can copy this password and paste it wherever you need.
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalElement = document.getElementById('generatePasswordModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        const field = modalContainer.querySelector('#generatedPasswordField');
        const regenBtn = modalContainer.querySelector('#regenPasswordBtn');
        const copyBtn = modalContainer.querySelector('#copyGeneratedPasswordBtn');

        if (regenBtn && field) {
            regenBtn.addEventListener('click', () => {
                generated = this.generateRandomPasswordValue();
                field.value = generated;
            });
        }

        if (copyBtn && field) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(field.value).then(() => {
                    this.showNotification('Password copied to clipboard!', 'success');
                });
            });
        }

        modalElement.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    // Refresh "Recent Passwords" panel on dashboard
    async refreshOverview() {
        // Prefer using the already-loaded list from PasswordManager
        if (window.passwordManager && Array.isArray(window.passwordManager.passwords)) {
            this.updateRecentPasswords(window.passwordManager.passwords);
            return;
        }

        // Fallback: fetch directly from API
        if (!this.auth) return;

        try {
            const data = await this.auth.apiRequest('/passwords');
            if (data?.success) {
                this.updateRecentPasswords(data.passwords || []);
            }
        } catch (error) {
            console.error('Overview load error:', error);
        }
    }

    // Load email count from API
    async loadEmailCount() {
        try {
            const data = await this.auth.apiRequest('/notifications/email-count');
            if (data?.count !== undefined) {
                this.emailCount = data.count;
                const element = document.getElementById('emailCount');
                if (element) {
                    element.textContent = this.emailCount;
                }
            }
        } catch (error) {
            console.error('Load email count error:', error);
        }
    }

    // Load uploaded Excel files
    async loadExcelFiles() {
        try {
            const data = await this.auth.apiRequest('/files');
            if (data?.files) {
                this.renderExcelFiles(data.files);
            }
        } catch (error) {
            console.error('Load Excel files error:', error);
        }
    }

    // Render Excel files list
    renderExcelFiles(files) {
        const container = document.getElementById('excelFilesList');
        if (!container) return;

        if (!files.length) {
            container.innerHTML = '<p class="text-muted mb-0 small">No Excel files uploaded yet.</p>';
            return;
        }

        let html = '<div class="table-responsive"><table class="table table-sm table-hover"><thead><tr><th>File Name</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>';
        files.forEach(file => {
            const uploadDate = new Date(file.uploaded_at).toLocaleDateString();
            html += `<tr>
                <td><i class="fas fa-file-excel text-success me-2"></i>${file.filename}</td>
                <td class="small text-muted">${uploadDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="window.dashboard.viewExcelFile(${file.id})" title="View/Download">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.dashboard.deleteExcelFile(${file.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // Upload Excel file
    async uploadExcelFile(file) {
        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            const data = await this.auth.apiRequest('/files/upload', {
                method: 'POST',
                body: formData
            });
            if (data?.success) {
                this.showNotification('Excel file uploaded successfully.', 'success');
                this.loadExcelFiles();
            } else {
                this.showNotification(data?.error || 'Failed to upload file.', 'danger');
            }
        } catch (error) {
            console.error('Upload Excel file error:', error);
            this.showNotification('Failed to upload file.', 'danger');
        }
    }

    // View/Download Excel file
    async viewExcelFile(fileId) {
        try {
            const response = await fetch(`/api/files/${fileId}/download`, {
                headers: {
                    'Authorization': `Bearer ${this.auth.token}`
                }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'excel_file.xlsx'; // Generic name, could be improved
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                this.showNotification('Failed to download file.', 'danger');
            }
        } catch (error) {
            console.error('View Excel file error:', error);
            this.showNotification('Failed to view file.', 'danger');
        }
    }

    // Delete Excel file
    async deleteExcelFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const data = await this.auth.apiRequest(`/files/${fileId}`, {
                method: 'DELETE'
            });
            if (data?.success) {
                this.showNotification('File deleted successfully.', 'success');
                this.loadExcelFiles();
            } else {
                this.showNotification(data?.error || 'Failed to delete file.', 'danger');
            }
        } catch (error) {
            console.error('Delete Excel file error:', error);
            this.showNotification('Failed to delete file.', 'danger');
        }
    }

    updateRecentPasswords(passwords) {
        const tbody = document.getElementById('recentPasswordsTable');
        const noMsg = document.getElementById('noPasswordsMessage');
        if (!tbody) return;

        if (!passwords.length) {
            tbody.innerHTML = '';
            if (noMsg) noMsg.style.display = 'block';
            return;
        }

        // Sort by created_at (newest first) if available
        const sorted = [...passwords].sort((a, b) => {
            const aDate = a.created_at ? new Date(a.created_at) : new Date(a.expiry_date);
            const bDate = b.created_at ? new Date(b.created_at) : new Date(b.expiry_date);
            return bDate - aDate;
        });

        let rows = '';
        sorted.forEach(pwd => {
            const expDate = new Date(pwd.expiry_date).toLocaleDateString();
            const daysLeft = pwd.days_left;
            let badgeClass = 'bg-success';
            let badgeText = 'Safe';

            if (daysLeft <= 0) {
                badgeClass = 'bg-danger';
                badgeText = 'Expired';
            } else if (daysLeft <= 7) {
                badgeClass = 'bg-warning';
                badgeText = `${daysLeft} days`;
            } else if (daysLeft <= 30) {
                badgeClass = 'bg-info';
                badgeText = `${daysLeft} days`;
            }

            rows += `
                <tr data-password-id="${pwd.id}">
                    <td>${pwd.app_name}</td>
                    <td>${pwd.username}</td>
                    <td>${expDate}</td>
                    <td>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger recent-pwd-delete" title="Remove this password">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rows;
        if (noMsg) noMsg.style.display = 'none';
    }
}

// Initialize global dashboard helper once DOM and auth are available
document.addEventListener('DOMContentLoaded', () => {
    if (!window.auth) return;

    window.dashboard = new DashboardUI(window.auth);

    // Top nav Add Password / Add Reminder
    const addPasswordNav = document.getElementById('addPasswordBtn');
    if (addPasswordNav) {
        addPasswordNav.addEventListener('click', (e) => {
            e.preventDefault();
            window.dashboard.showAddPasswordModal();
        });
    }

    // Add Reminder is handled by dashboard-ux.js for reliable overlay + working buttons

    // Quick actions
    const quickAddPassword = document.getElementById('quickAddPassword');
    if (quickAddPassword) {
        quickAddPassword.addEventListener('click', (e) => {
            e.preventDefault();
            window.dashboard.showAddPasswordModal();
        });
    }

    // quickAddReminder handled by dashboard-ux.js

    const quickGenerate = document.getElementById('quickGenerate');
    if (quickGenerate) {
        quickGenerate.addEventListener('click', (e) => {
            e.preventDefault();
            // Open standalone generator (no saving)
            window.dashboard.showGeneratePasswordModal();
        });
    }

    // quickExport handled by dashboard-ux.js (exports data as JSON)

    // Recent passwords / reminders "Add first" buttons
    const addFirstPassword = document.getElementById('addFirstPassword');
    if (addFirstPassword) {
        addFirstPassword.addEventListener('click', (e) => {
            e.preventDefault();
            window.dashboard.showAddPasswordModal();
        });
    }

    // addFirstReminder handled by dashboard-ux.js

    // Sidebar and header navigation helpers
    const scrollToElement = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const viewPasswords = document.getElementById('viewPasswords');
    if (viewPasswords) {
        viewPasswords.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToElement('recentPasswordsTable');
        });
    }

    const viewReminders = document.getElementById('viewReminders');
    if (viewReminders) {
        viewReminders.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToElement('remindersList');
        });
    }

    const viewAllPasswords = document.getElementById('viewAllPasswords');
    if (viewAllPasswords) {
        viewAllPasswords.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToElement('recentPasswordsTable');
        });
    }

    const viewAllReminders = document.getElementById('viewAllReminders');
    if (viewAllReminders) {
        viewAllReminders.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToElement('remindersList');
        });
    }

    const viewExpiringBtn = document.getElementById('viewExpiringBtn');
    if (viewExpiringBtn) {
        viewExpiringBtn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToElement('recentPasswordsTable');
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.reload();
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.dashboard.showNotification('Export feature will be available soon.', 'info');
        });
    }

    // Initial load of "Recent Passwords" panel
    window.dashboard.refreshOverview();

    // Load email count
    window.dashboard.loadEmailCount();

    // Load uploaded Excel files
    window.dashboard.loadExcelFiles();
});

// Passwords Module for SecurePass Pro

class PasswordManager {
    constructor() {
        this.auth = window.auth;
        this.baseUrl = 'http://localhost:5001/api';
        this.passwords = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filter = 'all';
        this.sortBy = 'expiry_date';
        this.sortOrder = 'asc';
        this.init();
    }

    async init() {
        if (!this.auth.token) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadPasswords();
        this.setupEventListeners();
        this.renderPasswords();

        // Keep Recent Passwords panel in sync with the full list
        if (window.dashboard && typeof window.dashboard.updateRecentPasswords === 'function') {
            window.dashboard.updateRecentPasswords(this.passwords);
        }
    }

    async loadPasswords() {
        try {
            const data = await this.auth.apiRequest('/passwords');
            if (data?.success) {
                this.passwords = data.passwords || [];
                this.updateStats();
            }
        } catch (error) {
            console.error('Load passwords error:', error);
            this.showNotification('Failed to load passwords', 'danger');
        }
    }

    updateStats() {
        const total = this.passwords.length;
        const expiring = this.passwords.filter(p => p.days_left <= 7 && p.days_left > 0).length;
        const expired = this.passwords.filter(p => p.days_left <= 0).length;
        const safe = this.passwords.filter(p => p.days_left > 30).length;

        // Update UI elements if they exist
        ['totalPasswords', 'expiringPasswords', 'expiredPasswords', 'safePasswords'].forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = [total, expiring, expired, safe][index];
            }
        });
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filter = e.target.dataset.filter;
                this.currentPage = 1;
                this.renderPasswords();
            });
        });

        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                [this.sortBy, this.sortOrder] = e.target.value.split('_');
                this.renderPasswords();
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchPasswords(e.target.value);
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.closest('.page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page) {
                    this.currentPage = page;
                    this.renderPasswords();
                }
            }
        });
    }

    getFilteredPasswords() {
        let filtered = [...this.passwords];

        // Apply filter
        switch (this.filter) {
            case 'expiring':
                filtered = filtered.filter(p => p.days_left <= 7 && p.days_left > 0);
                break;
            case 'expired':
                filtered = filtered.filter(p => p.days_left <= 0);
                break;
            case 'safe':
                filtered = filtered.filter(p => p.days_left > 30);
                break;
            case 'favorites':
                filtered = filtered.filter(p => p.is_favorite);
                break;
            // 'all' shows everything
        }

        // Apply search
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filtered = filtered.filter(p => 
                p.app_name.toLowerCase().includes(searchTerm) ||
                p.username.toLowerCase().includes(searchTerm) ||
                (p.category && p.category.toLowerCase().includes(searchTerm)) ||
                (p.notes && p.notes.toLowerCase().includes(searchTerm))
            );
        }

        // Apply sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            
            switch (this.sortBy) {
                case 'name':
                    aVal = a.app_name.toLowerCase();
                    bVal = b.app_name.toLowerCase();
                    break;
                case 'category':
                    aVal = a.category || '';
                    bVal = b.category || '';
                    break;
                case 'expiry_date':
                    aVal = new Date(a.expiry_date);
                    bVal = new Date(b.expiry_date);
                    break;
                case 'created_at':
                    aVal = new Date(a.created_at);
                    bVal = new Date(b.created_at);
                    break;
                default:
                    aVal = a[this.sortBy];
                    bVal = b[this.sortBy];
            }

            if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    renderPasswords() {
        const container = document.getElementById('passwordsContainer');
        if (!container) return;

        const filteredPasswords = this.getFilteredPasswords();
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredPasswords.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pagePasswords = filteredPasswords.slice(startIndex, endIndex);

        // Render passwords
        if (pagePasswords.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-key fa-3x text-muted mb-3"></i>
                    <h4>No passwords found</h4>
                    <p class="text-muted">Try changing your filters or add a new password</p>
                    <button class="btn btn-primary" id="addFirstPasswordBtn">
                        <i class="fas fa-plus me-1"></i>Add Your First Password
                    </button>
                </div>
            `;

            // Add event listener to button
            document.getElementById('addFirstPasswordBtn')?.addEventListener('click', () => {
                this.showAddPasswordModal();
            });

            return;
        }

        let html = '<div class="row g-3">';
        
        pagePasswords.forEach(password => {
            const daysLeft = password.days_left;
            let statusClass = 'border-left-success';
            let statusText = 'Safe';
            let statusIcon = 'fa-check-circle';
            
            if (daysLeft <= 0) {
                statusClass = 'border-left-danger';
                statusText = 'Expired';
                statusIcon = 'fa-exclamation-triangle';
            } else if (daysLeft <= 7) {
                statusClass = 'border-left-warning';
                statusText = `${daysLeft} days`;
                statusIcon = 'fa-exclamation-circle';
            } else if (daysLeft <= 30) {
                statusClass = 'border-left-info';
                statusText = `${daysLeft} days`;
                statusIcon = 'fa-info-circle';
            }

            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card password-card ${statusClass} h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 class="card-title mb-1">${password.app_name}</h5>
                                    ${password.category ? `<span class="badge bg-secondary">${password.category}</span>` : ''}
                                    ${password.is_favorite ? '<span class="badge bg-warning ms-1"><i class="fas fa-star"></i></span>' : ''}
                                </div>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                            type="button" data-bs-toggle="dropdown">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li>
                                            <a class="dropdown-item view-password" href="#" data-id="${password.id}">
                                                <i class="fas fa-eye me-2"></i>View
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item edit-password" href="#" data-id="${password.id}">
                                                <i class="fas fa-edit me-2"></i>Edit
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item toggle-favorite" href="#" data-id="${password.id}">
                                                <i class="fas ${password.is_favorite ? 'fa-star' : 'fa-star'} me-2"></i>
                                                ${password.is_favorite ? 'Remove Favorite' : 'Add Favorite'}
                                            </a>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-danger delete-password" href="#" data-id="${password.id}">
                                                <i class="fas fa-trash me-2"></i>Delete
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <small class="text-muted d-block">
                                    <i class="fas fa-user me-1"></i>${password.username}
                                </small>
                                ${password.website_url ? `
                                <small class="text-muted d-block">
                                    <i class="fas fa-globe me-1"></i>
                                    <a href="${password.website_url}" target="_blank" class="text-decoration-none">
                                        ${password.website_url}
                                    </a>
                                </small>` : ''}
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="badge ${statusClass.replace('border-left-', 'bg-')}">
                                        <i class="fas ${statusIcon} me-1"></i>${statusText}
                                    </span>
                                    <small class="text-muted d-block mt-1">
                                        Expires: ${new Date(password.expiry_date).toLocaleDateString()}
                                    </small>
                                </div>
                                <button class="btn btn-sm btn-outline-primary copy-password" 
                                        data-password="${password.password}">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Add pagination
        if (totalPages > 1) {
            html += this.renderPagination(totalPages);
        }

        container.innerHTML = html;

        // Add event listeners to dynamic elements
        this.setupPasswordCardEvents();
    }

    renderPagination(totalPages) {
        let html = `
            <nav class="mt-4" aria-label="Page navigation">
                <ul class="pagination justify-content-center">
        `;

        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        html += `
                </ul>
            </nav>
        `;

        return html;
    }

    setupPasswordCardEvents() {
        // View password
        document.querySelectorAll('.view-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const passwordId = btn.dataset.id;
                const password = this.passwords.find(p => p.id == passwordId);
                if (password) {
                    window.dashboard.showPasswordDetails(password);
                }
            });
        });

        // Edit password
        document.querySelectorAll('.edit-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const passwordId = btn.dataset.id;
                this.showEditPasswordModal(passwordId);
            });
        });

        // Toggle favorite
        document.querySelectorAll('.toggle-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const passwordId = btn.dataset.id;
                await this.toggleFavorite(passwordId);
            });
        });

        // Delete password
        document.querySelectorAll('.delete-password').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const passwordId = btn.dataset.id;
                await this.deletePassword(passwordId);
            });
        });

        // Copy password to clipboard
        document.querySelectorAll('.copy-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const password = btn.dataset.password;
                navigator.clipboard.writeText(password).then(() => {
                    this.showNotification('Password copied to clipboard!', 'success');
                });
            });
        });
    }

    async showEditPasswordModal(passwordId) {
        const password = this.passwords.find(p => p.id == passwordId);
        if (!password) return;

        const modalHTML = `
            <div class="modal fade" id="editPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-edit me-2"></i>Edit Password
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editPasswordForm">
                                <div class="mb-3">
                                    <label class="form-label">Application Name *</label>
                                    <input type="text" class="form-control" name="app_name" 
                                           value="${password.app_name}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Website URL</label>
                                    <input type="url" class="form-control" name="website_url" 
                                           value="${password.website_url || ''}">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Username *</label>
                                        <input type="text" class="form-control" name="username" 
                                               value="${password.username}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Password *</label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" 
                                                   name="password" id="editPassword" 
                                                   value="${password.password}" required>
                                            <button class="btn btn-outline-secondary" type="button" 
                                                    id="toggleEditPassword">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-outline-secondary" type="button" 
                                                    onclick="window.dashboard.generatePassword()">
                                                <i class="fas fa-dice"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Expiry Date *</label>
                                        <input type="date" class="form-control" name="expiry_date" 
                                               value="${password.expiry_date.split('T')[0]}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Reminder Before (days)</label>
                                        <select class="form-select" name="days_before_reminder">
                                            <option value="1" ${password.days_before_reminder == 1 ? 'selected' : ''}>1 day before</option>
                                            <option value="3" ${password.days_before_reminder == 3 ? 'selected' : ''}>3 days before</option>
                                            <option value="7" ${password.days_before_reminder == 7 ? 'selected' : ''}>7 days before</option>
                                            <option value="14" ${password.days_before_reminder == 14 ? 'selected' : ''}>14 days before</option>
                                            <option value="30" ${password.days_before_reminder == 30 ? 'selected' : ''}>30 days before</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Category</label>
                                    <select class="form-select" name="category">
                                        <option value="">Select Category</option>
                                        <option value="Social Media" ${password.category == 'Social Media' ? 'selected' : ''}>Social Media</option>
                                        <option value="Email" ${password.category == 'Email' ? 'selected' : ''}>Email</option>
                                        <option value="Banking" ${password.category == 'Banking' ? 'selected' : ''}>Banking</option>
                                        <option value="Work" ${password.category == 'Work' ? 'selected' : ''}>Work</option>
                                        <option value="Personal" ${password.category == 'Personal' ? 'selected' : ''}>Personal</option>
                                        <option value="Other" ${password.category == 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notes</label>
                                    <textarea class="form-control" name="notes" rows="3">${password.notes || ''}</textarea>
                                </div>
                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" name="is_favorite" 
                                           id="editIsFavorite" ${password.is_favorite ? 'checked' : ''}>
                                    <label class="form-check-label" for="editIsFavorite">
                                        Mark as favorite
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="updatePasswordBtn">Update Password</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editPasswordModal'));
        modal.show();

        // Setup event listeners
        const toggleBtn = modalContainer.querySelector('#toggleEditPassword');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const passwordField = modalContainer.querySelector('#editPassword');
                const icon = toggleBtn.querySelector('i');
                
                if (passwordField.type === 'password') {
                    passwordField.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    passwordField.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }

        // Update button
        const updateBtn = modalContainer.querySelector('#updatePasswordBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                await this.updatePassword(passwordId, modalContainer);
            });
        }

        // Remove modal from DOM after hiding
        modalContainer.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    async updatePassword(passwordId, modalContainer) {
        const form = modalContainer.querySelector('#editPasswordForm');
        const formData = new FormData(form);
        
        const passwordData = {
            app_name: formData.get('app_name'),
            website_url: formData.get('website_url'),
            username: formData.get('username'),
            password: formData.get('password'),
            expiry_date: formData.get('expiry_date'),
            days_before_reminder: parseInt(formData.get('days_before_reminder')) || 7,
            category: formData.get('category'),
            notes: formData.get('notes'),
            is_favorite: formData.get('is_favorite') === 'on'
        };

        // Validate
        if (!passwordData.app_name || !passwordData.username || !passwordData.password || !passwordData.expiry_date) {
            this.showNotification('Please fill all required fields', 'warning');
            return;
        }

        try {
            const result = await this.auth.apiRequest(`/passwords/${passwordId}`, {
                method: 'PUT',
                body: JSON.stringify(passwordData)
            });

            if (result?.success) {
                this.showNotification('Password updated successfully', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editPasswordModal'));
                modal.hide();
                
                // Refresh data
                await this.loadPasswords();
                this.renderPasswords();

                if (window.dashboard && typeof window.dashboard.refreshOverview === 'function') {
                    window.dashboard.refreshOverview();
                }


            } else {
                this.showNotification(result?.message || 'Failed to update password', 'danger');
            }
        } catch (error) {
            console.error('Update password error:', error);
            this.showNotification('Failed to update password', 'danger');
        }
    }

    async toggleFavorite(passwordId) {
        try {
            const password = this.passwords.find(p => p.id == passwordId);
            if (!password) return;

            const result = await this.auth.apiRequest(`/passwords/${passwordId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...password,
                    is_favorite: !password.is_favorite
                })
            });

            if (result?.success) {
                this.showNotification(
                    password.is_favorite ? 'Removed from favorites' : 'Added to favorites',
                    'success'
                );
                
                // Refresh data
                await this.loadPasswords();
                this.renderPasswords();

                if (window.dashboard && typeof window.dashboard.refreshOverview === 'function') {
                    window.dashboard.refreshOverview();
                }


            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
            this.showNotification('Failed to update favorite status', 'danger');
        }
    }

    async deletePassword(passwordId) {
        if (!confirm('Are you sure you want to delete this password? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await this.auth.apiRequest(`/passwords/${passwordId}`, {
                method: 'DELETE'
            });

            if (result?.success) {
                this.showNotification('Password deleted successfully', 'success');
                
                // Refresh data
                await this.loadPasswords();
                this.renderPasswords();

                if (window.dashboard && typeof window.dashboard.refreshOverview === 'function') {
                    window.dashboard.refreshOverview();
                }
            } else {
                this.showNotification(result?.message || 'Failed to delete password', 'danger');
            }
        } catch (error) {
            console.error('Delete password error:', error);
            this.showNotification('Failed to delete password', 'danger');
        }
    }

    showAddPasswordModal() {
        window.dashboard.showAddPasswordModal();
    }

    searchPasswords(searchTerm) {
        this.currentPage = 1;
        this.renderPasswords();
    }

    showNotification(message, type = 'info') {
        window.dashboard.showNotification(message, type);
    }
}

// Initialize password manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.passwordManager = new PasswordManager();
});