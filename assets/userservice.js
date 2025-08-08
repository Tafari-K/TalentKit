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
            clearInterval(this.autoSaveInterval);
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