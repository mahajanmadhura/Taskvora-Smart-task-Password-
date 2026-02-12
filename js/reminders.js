// Reminders Module for SecurePass Pro

class ReminderManager {
    constructor() {
        this.auth = window.auth;
        this.baseUrl = 'http://localhost:5001/api';
        this.reminders = [];
        this.init();
    }

    async init() {
        if (!this.auth.token) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadReminders();
        this.setupEventListeners();
        this.renderReminders();
    }

    async loadReminders() {
        try {
            const data = await this.auth.apiRequest('/reminders');
            if (data?.success) {
                this.reminders = data.reminders || [];
                this.updateStats();
            }
        } catch (error) {
            console.error('Load reminders error:', error);
            this.showNotification('Failed to load reminders', 'danger');
        }
    }

    updateStats() {
        const total = this.reminders.length;
        const completed = this.reminders.filter(r => r.is_completed).length;
        const upcoming = this.reminders.filter(r => !r.is_completed).length;
        const overdue = this.reminders.filter(r => {
            if (r.is_completed) return false;
            const reminderDate = new Date(r.reminder_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return reminderDate < today;
        }).length;

        // Update UI elements if they exist
        ['totalReminders', 'completedReminders', 'upcomingReminders', 'overdueReminders'].forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = [total, completed, upcoming, overdue][index];
            }
        });

        // Update dashboard total reminders count
        const activeRemindersEl = document.getElementById('activeReminders');
        if (activeRemindersEl) {
            activeRemindersEl.textContent = total;
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.reminder-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterReminders(filter);
            });
        });

        // Add reminder button
        const addBtn = document.getElementById('addReminderBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddReminderModal();
            });
        }

        // Mark all as complete button
        const markAllBtn = document.getElementById('markAllCompleteBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async () => {
                await this.markAllComplete();
            });
        }
    }

    filterReminders(filter) {
        const reminderItems = document.querySelectorAll('.reminder-item');
        
        reminderItems.forEach(item => {
            let show = true;
            
            switch (filter) {
                case 'all':
                    show = true;
                    break;
                case 'upcoming':
                    const isCompleted = item.dataset.completed === 'true';
                    const isOverdue = item.dataset.overdue === 'true';
                    show = !isCompleted && !isOverdue;
                    break;
                case 'completed':
                    show = item.dataset.completed === 'true';
                    break;
                case 'overdue':
                    show = item.dataset.overdue === 'true';
                    break;
                case 'high':
                    show = item.dataset.priority === 'high';
                    break;
                case 'medium':
                    show = item.dataset.priority === 'medium';
                    break;
                case 'low':
                    show = item.dataset.priority === 'low';
                    break;
            }
            
            item.style.display = show ? 'block' : 'none';
        });

        // Update active filter button
        document.querySelectorAll('.reminder-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    renderReminders() {
        const container = document.getElementById('remindersContainer');
        if (!container) return;

        if (this.reminders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell fa-3x text-muted mb-3"></i>
                    <h4>No reminders yet</h4>
                    <p class="text-muted">Add reminders for important tasks and deadlines</p>
                </div>
            `;

            return;
        }

        let html = '<div class="reminders-list">';
        
        this.reminders.forEach(reminder => {
            const reminderDate = new Date(reminder.reminder_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.ceil((reminderDate - today) / (1000 * 60 * 60 * 24));
            
            let status = 'upcoming';
            let statusClass = 'border-left-primary';
            let statusIcon = 'fa-calendar-alt';
            let statusText = '';
            
            if (reminder.is_completed) {
                status = 'completed';
                statusClass = 'border-left-success';
                statusIcon = 'fa-check-circle';
                statusText = 'Completed';
            } else if (daysDiff < 0) {
                status = 'overdue';
                statusClass = 'border-left-danger';
                statusIcon = 'fa-exclamation-triangle';
                statusText = 'Overdue';
            } else if (daysDiff === 0) {
                status = 'today';
                statusClass = 'border-left-warning';
                statusIcon = 'fa-exclamation-circle';
                statusText = 'Today';
            } else if (daysDiff <= 3) {
                status = 'soon';
                statusClass = 'border-left-warning';
                statusIcon = 'fa-clock';
                statusText = `${daysDiff} days`;
            } else {
                statusText = `${daysDiff} days`;
            }

            let priorityBadge = '';
            switch (reminder.priority) {
                case 'high':
                    priorityBadge = '<span class="badge bg-danger">High</span>';
                    break;
                case 'medium':
                    priorityBadge = '<span class="badge bg-warning">Medium</span>';
                    break;
                case 'low':
                    priorityBadge = '<span class="badge bg-info">Low</span>';
                    break;
            }

            html += `
                <div class="card reminder-item mb-3 ${statusClass}" 
                     data-id="${reminder.id}"
                     data-completed="${reminder.is_completed}"
                     data-overdue="${status === 'overdue'}"
                     data-priority="${reminder.priority}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                    <h5 class="card-title mb-0 me-2">${reminder.title}</h5>
                                    ${priorityBadge}
                                    ${reminder.category ? `<span class="badge bg-secondary ms-1">${reminder.category}</span>` : ''}
                                </div>
                                
                                ${reminder.description ? `
                                <p class="card-text text-muted mb-2">${reminder.description}</p>
                                ` : ''}
                                
                                <div class="d-flex align-items-center">
                                    <small class="text-muted me-3">
                                        <i class="fas fa-calendar me-1"></i>
                                        ${reminderDate.toLocaleDateString()}
                                    </small>
                                    <small class="${status === 'overdue' ? 'text-danger' : status === 'today' ? 'text-warning' : 'text-muted'}">
                                        <i class="fas ${statusIcon} me-1"></i>
                                        ${statusText}
                                    </small>
                                </div>
                            </div>
                            
                            <div class="btn-group">
                                ${!reminder.is_completed ? `
                                <button class="btn btn-sm btn-outline-success complete-reminder" 
                                        data-id="${reminder.id}">
                                    <i class="fas fa-check"></i>
                                </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline-primary edit-reminder" 
                                        data-id="${reminder.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-reminder" 
                                        data-id="${reminder.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        ${reminder.completed_at ? `
                        <div class="mt-2">
                            <small class="text-success">
                                <i class="fas fa-check-circle me-1"></i>
                                Completed on ${new Date(reminder.completed_at).toLocaleDateString()}
                            </small>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Add event listeners to dynamic elements
        this.setupReminderEvents();
    }

    setupReminderEvents() {
        // Complete reminder
        document.querySelectorAll('.complete-reminder').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reminderId = btn.dataset.id;
                await this.markReminderComplete(reminderId);
            });
        });

        // Edit reminder
        document.querySelectorAll('.edit-reminder').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reminderId = btn.dataset.id;
                this.showEditReminderModal(reminderId);
            });
        });

        // Delete reminder
        document.querySelectorAll('.delete-reminder').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reminderId = btn.dataset.id;
                await this.deleteReminder(reminderId);
            });
        });
    }

    async markReminderComplete(reminderId) {
        try {
            const result = await this.auth.apiRequest(`/reminders/${reminderId}/complete`, {
                method: 'PUT'
            });

            if (result?.success) {
                this.showNotification('Reminder marked as complete', 'success');
                await this.loadReminders();
                this.renderReminders();
            }
        } catch (error) {
            console.error('Complete reminder error:', error);
            this.showNotification('Failed to update reminder', 'danger');
        }
    }

    async markAllComplete() {
        if (!confirm('Mark all upcoming reminders as complete?')) {
            return;
        }

        try {
            const upcomingReminders = this.reminders.filter(r => !r.is_completed);
            const promises = upcomingReminders.map(reminder => 
                this.auth.apiRequest(`/reminders/${reminder.id}/complete`, {
                    method: 'PUT'
                })
            );

            await Promise.all(promises);
            
            this.showNotification('All reminders marked as complete', 'success');
            await this.loadReminders();
            this.renderReminders();
            
        } catch (error) {
            console.error('Mark all complete error:', error);
            this.showNotification('Failed to update reminders', 'danger');
        }
    }

    showEditReminderModal(reminderId) {
        const reminder = this.reminders.find(r => r.id == reminderId);
        if (!reminder) return;

        const modalHTML = `
            <div class="modal fade" id="editReminderModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-edit me-2"></i>Edit Reminder
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editReminderForm">
                                <div class="mb-3">
                                    <label class="form-label">Title *</label>
                                    <input type="text" class="form-control" name="title" 
                                           value="${reminder.title}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" name="description" rows="3">${reminder.description || ''}</textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Reminder Date *</label>
                                        <input type="date" class="form-control" name="reminder_date" 
                                               value="${reminder.reminder_date.split('T')[0]}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Priority</label>
                                        <select class="form-select" name="priority">
                                            <option value="low" ${reminder.priority == 'low' ? 'selected' : ''}>Low</option>
                                            <option value="medium" ${reminder.priority == 'medium' ? 'selected' : ''}>Medium</option>
                                            <option value="high" ${reminder.priority == 'high' ? 'selected' : ''}>High</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Category</label>
                                    <select class="form-select" name="category">
                                        <option value="">Select Category</option>
                                        <option value="Work" ${reminder.category == 'Work' ? 'selected' : ''}>Work Task</option>
                                        <option value="Personal" ${reminder.category == 'Personal' ? 'selected' : ''}>Personal</option>
                                        <option value="Security" ${reminder.category == 'Security' ? 'selected' : ''}>Security</option>
                                        <option value="Meeting" ${reminder.category == 'Meeting' ? 'selected' : ''}>Meeting</option>
                                        <option value="Deadline" ${reminder.category == 'Deadline' ? 'selected' : ''}>Deadline</option>
                                        <option value="Other" ${reminder.category == 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="updateReminderBtn">Update Reminder</button>
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
        const modal = new bootstrap.Modal(document.getElementById('editReminderModal'));
        modal.show();

        // Update button
        const updateBtn = modalContainer.querySelector('#updateReminderBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                await this.updateReminder(reminderId, modalContainer);
            });
        }

        // Remove modal from DOM after hiding
        modalContainer.addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }

    async updateReminder(reminderId, modalContainer) {
        const form = modalContainer.querySelector('#editReminderForm');
        const formData = new FormData(form);
        
        const reminderData = {
            title: formData.get('title'),
            description: formData.get('description'),
            reminder_date: formData.get('reminder_date'),
            priority: formData.get('priority') || 'medium',
            category: formData.get('category')
        };

        // Validate
        if (!reminderData.title || !reminderData.reminder_date) {
            this.showNotification('Please fill all required fields', 'warning');
            return;
        }

        try {
            const result = await this.auth.apiRequest(`/reminders/${reminderId}`, {
                method: 'PUT',
                body: JSON.stringify(reminderData)
            });

            if (result?.success) {
                this.showNotification('Reminder updated successfully', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editReminderModal'));
                modal.hide();
                
                // Refresh data
                await this.loadReminders();
                this.renderReminders();
            } else {
                this.showNotification(result?.message || 'Failed to update reminder', 'danger');
            }
        } catch (error) {
            console.error('Update reminder error:', error);
            this.showNotification('Failed to update reminder', 'danger');
        }
    }

    async deleteReminder(reminderId) {
        if (!confirm('Are you sure you want to delete this reminder?')) {
            return;
        }

        try {
            const result = await this.auth.apiRequest(`/reminders/${reminderId}`, {
                method: 'DELETE'
            });

            if (result?.success) {
                this.showNotification('Reminder deleted successfully', 'success');
                
                // Refresh data
                await this.loadReminders();
                this.renderReminders();
            } else {
                this.showNotification(result?.message || 'Failed to delete reminder', 'danger');
            }
        } catch (error) {
            console.error('Delete reminder error:', error);
            this.showNotification('Failed to delete reminder', 'danger');
        }
    }

    showAddReminderModal() {
        window.dashboard.showAddReminderModal();
    }

    showNotification(message, type = 'info') {
        window.dashboard.showNotification(message, type);
    }
}

// Initialize reminder manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.reminderManager = new ReminderManager();
});