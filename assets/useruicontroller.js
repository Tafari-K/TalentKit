/**
 * UserService - Pure business logic for user management
 * No DOM manipulation or UI concerns
 */
class UserService {
    constructor() {
        this.users = [];
        this.nextId = 1;
        this.observers = []; // For notifying UI of changes
    }

    /**
     * Observer pattern - allows UI components to listen for changes
     */
    subscribe(callback) {
        this.observers.push(callback);
    }

    unsubscribe(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    notify(event, data) {
        this.observers.forEach(callback => callback(event, data));
    }

    /**
     * Core business logic methods
     */
    async createUser(userData) {
        try {
            // Validate required fields
            const validation = this.validateUser(userData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check for duplicate email
            if (this.findUserByEmail(userData.email)) {
                throw new Error('A user with this email already exists');
            }

            // Create user object
            const newUser = {
                id: this.nextId++,
                ...userData,
                createdAt: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                status: userData.status || 'active'
            };

            // Add to collection
            this.users.push(newUser);

            // Notify observers
            this.notify('userCreated', newUser);
            this.notify('usersChanged', this.users);

            return { success: true, data: newUser };

        } catch (error) {
            this.notify('error', { message: error.message, type: 'create' });
            return { success: false, error: error.message };
        }
    }

    async updateUser(id, userData) {
        try {
            const userIndex = this.users.findIndex(user => user.id === parseInt(id));
            if (userIndex === -1) {
                throw new Error('User not found');
            }

            // Validate data
            const validation = this.validateUser(userData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check for duplicate email (excluding current user)
            const existingUser = this.findUserByEmail(userData.email);
            if (existingUser && existingUser.id !== parseInt(id)) {
                throw new Error('A user with this email already exists');
            }

            // Update user
            const originalUser = { ...this.users[userIndex] };
            this.users[userIndex] = {
                ...this.users[userIndex],
                ...userData,
                lastModified: new Date().toISOString()
            };

            // Notify observers
            this.notify('userUpdated', { 
                original: originalUser, 
                updated: this.users[userIndex] 
            });
            this.notify('usersChanged', this.users);

            return { success: true, data: this.users[userIndex] };

        } catch (error) {
            this.notify('error', { message: error.message, type: 'update' });
            return { success: false, error: error.message };
        }
    }

    async deleteUser(id) {
        try {
            const userIndex = this.users.findIndex(user => user.id === parseInt(id));
            if (userIndex === -1) {
                throw new Error('User not found');
            }

            const deletedUser = this.users[userIndex];
            this.users.splice(userIndex, 1);

            // Notify observers
            this.notify('userDeleted', deletedUser);
            this.notify('usersChanged', this.users);

            return { success: true, data: deletedUser };

        } catch (error) {
            this.notify('error', { message: error.message, type: 'delete' });
            return { success: false, error: error.message };
        }
    }

    /**
     * Query methods
     */
    getAllUsers() {
        return [...this.users]; // Return copy to prevent external mutation
    }

    getUserById(id) {
        return this.users.find(user => user.id === parseInt(id));
    }

    getUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    getUsersByType(type) {
        return this.users.filter(user => user.userType === type);
    }

    searchUsers(query) {
        if (!query || query.trim() === '') {
            return this.getAllUsers();
        }

        const searchTerm = query.toLowerCase().trim();
        return this.users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm) ||
            user.lastName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.userType.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Statistics and analytics
     */
    getStats() {
        const total = this.users.length;
        const active = this.users.filter(user => user.status === 'active').length;
        const inactive = total - active;
        
        const today = new Date().toDateString();
        const newToday = this.users.filter(user => 
            new Date(user.createdAt).toDateString() === today
        ).length;

        const byType = this.users.reduce((acc, user) => {
            acc[user.userType] = (acc[user.userType] || 0) + 1;
            return acc;
        }, {});

        return {
            total,
            active,
            inactive,
            newToday,
            byType
        };
    }

    /**
     * Validation logic
     */
    validateUser(userData) {
        const errors = [];
        const required = ['firstName', 'lastName', 'email', 'phone', 'userType'];

        // Check required fields
        required.forEach(field => {
            if (!userData[field] || userData[field].trim() === '') {
                errors.push(`${field} is required`);
            }
        });

        // Validate email format
        if (userData.email && !this.isValidEmail(userData.email)) {
            errors.push('Invalid email format');
        }

        // Validate user type
        const validTypes = ['client', 'provider', 'admin'];
        if (userData.userType && !validTypes.includes(userData.userType)) {
            errors.push('Invalid user type');
        }

        // Validate status
        const validStatuses = ['active', 'inactive'];
        if (userData.status && !validStatuses.includes(userData.status)) {
            errors.push('Invalid status');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Helper methods
     */
    findUserByEmail(email) {
        return this.users.find(user => user.email === email);
    }

    /**
     * Bulk operations
     */
    async importUsers(usersData) {
        const results = {
            success: [],
            failed: []
        };

        for (const userData of usersData) {
            const result = await this.createUser(userData);
            if (result.success) {
                results.success.push(result.data);
            } else {
                results.failed.push({ userData, error: result.error });
            }
        }

        this.notify('bulkImport', results);
        return results;
    }

    async exportUsers() {
        return {
            users: this.getAllUsers(),
            exportDate: new Date().toISOString(),
            stats: this.getStats()
        };
    }

    /**
     * Data persistence methods (ready for API integration)
     */
    async loadUsers() {
        try {
            // This is where you'd make API calls
            // const response = await fetch('/api/users');
            // const users = await response.json();
            // this.users = users;

            // For now, load from localStorage or sample data
            const stored = localStorage.getItem('appointme_users');
            if (stored) {
                this.users = JSON.parse(stored);
                this.nextId = Math.max(...this.users.map(u => u.id), 0) + 1;
            } else {
                // Load sample data
                await this.loadSampleData();
            }

            this.notify('usersLoaded', this.users);
            return { success: true, data: this.users };

        } catch (error) {
            this.notify('error', { message: error.message, type: 'load' });
            return { success: false, error: error.message };
        }
    }

    async saveUsers() {
        try {
            // This is where you'd make API calls
            // await fetch('/api/users', { method: 'PUT', body: JSON.stringify(this.users) });

            // For now, save to localStorage
            localStorage.setItem('appointme_users', JSON.stringify(this.users));
            
            this.notify('usersSaved', this.users);
            return { success: true };

        } catch (error) {
            this.notify('error', { message: error.message, type: 'save' });
            return { success: false, error: error.message };
        }
    }

    async loadSampleData() {
        const sampleUsers = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1 (555) 123-4567',
                userType: 'client',
                status: 'active'
            },
            {
                firstName: 'Dr. Sarah',
                lastName: 'Smith',
                email: 'sarah.smith@clinic.com',
                phone: '+1 (555) 987-6543',
                userType: 'provider',
                status: 'active'
            },
            {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@appointme.com',
                phone: '+1 (555) 000-0000',
                userType: 'admin',
                status: 'active'
            }
        ];

        for (const userData of sampleUsers) {
            await this.createUser(userData);
        }
    }

    /**
     * Auto-save functionality
     */
    enableAutoSave(interval = 30000) { // 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveUsers();
        }, interval);
    }

    disableAutoSave() {
        if (this.autoSaveInterval) {
         /**
 * UserUIController - Handles all UI interactions and DOM manipulation
 * Communicates with UserService for business logic
 */
class UserUIController {
    constructor(userService) {
        this.userService = userService;
        this.currentEditId = null;
        this.elements = {};
        this.init();
    }

    /**
     * Initialize controller
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.subscribeToService();
        this.loadInitialData();
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Form elements
            userForm: document.getElementById('userForm'),
            formTitle: document.getElementById('formTitle'),
            submitBtn: document.getElementById('submitBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            
            // Form inputs
            firstName: document.getElementById('firstName'),
            lastName: document.getElementById('lastName'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            userType: document.getElementById('userType'),
            status: document.getElementById('status'),
            
            // Search and display
            searchInput: document.getElementById('searchUsers'),
            usersList: document.getElementById('usersList'),
            
            // Statistics
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            newUsersToday: document.getElementById('newUsersToday')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Form submission
        this.elements.userForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Cancel edit
        this.elements.cancelBtn.addEventListener('click', () => this.cancelEdit());
        
        // Search functionality
        this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Auto-save on form changes (optional)
        this.elements.userForm.addEventListener('input', () => this.showUnsavedChanges());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window events
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    }

    /**
     * Subscribe to service events (Observer pattern)
     */
    subscribeToService() {
        this.userService.subscribe((event, data) => {
            switch (event) {
                case 'userCreated':
                    this.onUserCreated(data);
                    break;
                case 'userUpdated':
                    this.onUserUpdated(data);
                    break;
                case 'userDeleted':
                    this.onUserDeleted(data);
                    break;
                case 'usersChanged':
                    this.onUsersChanged(data);
                    break;
                case 'usersLoaded':
                    this.onUsersLoaded(data);
                    break;
                case 'error':
                    this.onError(data);
                    break;
            }
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        this.showLoading(true);
        await this.userService.loadUsers();
        this.showLoading(false);
    }

    /**
     * Event handlers
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);
        
        // Show loading state
        this.setFormLoading(true);
        
        let result;
        if (this.currentEditId) {
            result = await this.userService.updateUser(this.currentEditId, userData);
        } else {
            result = await this.userService.createUser(userData);
        }
        
        this.setFormLoading(false);
        
        if (result.success) {
            this.clearForm();
        }
        // Error handling is done in service event handlers
    }

    handleSearch(query) {
        const filteredUsers = this.userService.searchUsers(query);
        this.renderUsers(filteredUsers);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.userService.saveUsers();
        }
        
        // Escape to cancel edit
        if (e.key === 'Escape' && this.currentEditId) {
            this.cancelEdit();
        }
        
        // Ctrl/Cmd + N for new user
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.elements.firstName.focus();
        }
    }

    handleBeforeUnload(e) {
        if (this.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    }

    /**
     * Service event handlers (Observer pattern callbacks)
     */
    onUserCreated(user) {
        this.showNotification(`User ${user.firstName} ${user.lastName} created successfully!`, 'success');
        this.hideUnsavedChanges();
    }

    onUserUpdated(data) {
        this.showNotification(`User ${data.updated.firstName} ${data.updated.lastName} updated successfully!`, 'success');
        this.hideUnsavedChanges();
    }

    onUserDeleted(user) {
        this.showNotification(`User ${user.firstName} ${user.lastName} deleted successfully!`, 'success');
    }

    onUsersChanged(users) {
        this.updateStats();
        this.renderUsers();
        this.userService.saveUsers(); // Auto-save
    }

    onUsersLoaded(users) {
        this.updateStats();
        this.renderUsers();
        this.showNotification('Users loaded successfully!', 'info');
    }

    onError(error) {
        this.showNotification(error.message, 'error');
        console.error('UserService Error:', error);
    }

    /**
     * UI manipulation methods
     */
    editUser(id) {
        const user = this.userService.getUserById(id);
        if (user) {
            this.currentEditId = id;
            this.populateForm(user);
            this.elements.firstName.focus();
        }
    }

    async deleteUser(id) {
        const user = this.userService.getUserById(id);
        if (!user) return;

        const confirmMessage = `Are you sure you want to delete ${user.firstName} ${user.lastName}?`;
        if (!confirm(confirmMessage)) return;

        await this.userService.deleteUser(id);
    }

    populateForm(user) {
        this.elements.firstName.value = user.firstName;
        this.elements.lastName.value = user.lastName;
        this.elements.email.value = user.email;
        this.elements.phone.value = user.phone;
        this.elements.userType.value = user.userType;
        this.elements.status.value = user.status;
        
        // Update UI state
        this.elements.formTitle.textContent = 'Edit User';
        this.elements.submitBtn.textContent = 'Update User';
        this.elements.cancelBtn.style.display = 'block';
        
        // Add visual indication
        this.elements.userForm.classList.add('editing');
    }

    clearForm() {
        this.elements.userForm.reset();
        this.cancelEdit();
        this.hideUnsavedChanges();
    }

    cancelEdit() {
        this.currentEditId = null;
        this.elements.formTitle.textContent = 'Add New User';
        this.elements.submitBtn.textContent = 'Add User';
        this.elements.cancelBtn.style.display = 'none';
        this.elements.userForm.classList.remove('editing');
        this.hideUnsavedChanges();
    }

    /**
     * Rendering methods
     */
    updateStats() {
        const stats = this.userService.getStats();
        
        // Animate numbers
        this.animateNumber(this.elements.totalUsers, stats.total);
        this.animateNumber(this.elements.activeUsers, stats.active);
        this.animateNumber(this.elements.newUsersToday, stats.newToday);
    }

    renderUsers(usersToRender = null) {
        const users = usersToRender || this.userService.getAllUsers();
        
        if (users.length === 0) {
            this.renderEmptyState(usersToRender !== null);
            return;
        }

        const usersHTML = users.map(user => this.createUserCardHTML(user)).join('');
        this.elements.usersList.innerHTML = usersHTML;
    }

    renderEmptyState(isSearchResult = false) {
        const message = isSearchResult ? 'No users found' : 'No users registered yet';
        const subMessage = isSearchResult ? 
            'Try adjusting your search criteria' : 
            'Add your first user using the form on the left';

        this.elements.usersList.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;">👥</div>
                <h3>${message}</h3>
                <p>${subMessage}</p>
            </div>
        `;
    }

    createUserCardHTML(user) {
        const statusColor = user.status === 'active' ? '#27ae60' : '#e74c3c';
        const userTypeFormatted = user.userType.charAt(0).toUpperCase() + user.userType.slice(1);
        const statusFormatted = user.status.charAt(0).toUpperCase() + user.status.slice(1);
        
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-info">
                    <div class="user-details">
                        <h3>${user.firstName} ${user.lastName}</h3>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Phone:</strong> ${user.phone}</p>
                        <p><strong>Type:</strong> ${userTypeFormatted}</p>
                        <p><strong>Status:</strong> <span style="color: ${statusColor}">${statusFormatted}</span></p>
                        <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-small" onclick="userUIController.editUser(${user.id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="userUIController.deleteUser(${user.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * UI state management
     */
    showLoading(show = true) {
        if (show) {
            document.body.classList.add('loading');
            this.showNotification('Loading users...', 'info', 0); // 0 = no auto-hide
        } else {
            document.body.classList.remove('loading');
            this.hideNotifications();
        }
    }

    setFormLoading(loading = true) {
        this.elements.submitBtn.disabled = loading;
        this.elements.submitBtn.textContent = loading ? 
            (this.currentEditId ? 'Updating...' : 'Adding...') : 
            (this.currentEditId ? 'Update User' : 'Add User');
    }

    showUnsavedChanges() {
        this.elements.userForm.classList.add('has-changes');
    }

    hideUnsavedChanges() {
        this.elements.userForm.classList.remove('has-changes');
    }

    hasUnsavedChanges() {
        return this.elements.userForm.classList.contains('has-changes');
    }

    /**
     * Notification system
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications of the same type
        this.hideNotifications(type);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-hide if duration specified
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
    }

    hideNotifications(type = null) {
        const selector = type ? `.notification-${type}` : '.notification';
        const notifications = document.querySelectorAll(selector);
        notifications.forEach(notification => this.hideNotification(notification));
    }

    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        return colors[type] || colors.info;
    }

    /**
     * Utility methods
     */
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = targetValue > currentValue ? 1 : -1;
        const duration = 300;
        const steps = Math.abs(targetValue - currentValue);
        const stepDuration = duration / Math.max(steps, 1);
        
        let current = currentValue;
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetValue) {
                clearInterval(timer);
            }
        }, stepDuration);
    }

    /**
     * Public methods for external use
     */
    refresh() {
        this.loadInitialData();
    }

    exportData() {
        return this.userService.exportUsers();
    }

    async importData(data) {
        return await this.userService.importUsers(data);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserUIController;
} else {
    window.UserUIController = UserUIController;
}   clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserService;
} else {
    window.UserService = UserService;
}