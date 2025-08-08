class UserManager {
    constructor() {
        this.users = [];
        this.currentEditId = null;
        this.nextId = 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
        this.renderUsers();
    }

    bindEvents() {
        const form = document.getElementById('userForm');
        const searchInput = document.getElementById('searchUsers');
        const cancelBtn = document.getElementById('cancelBtn');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        cancelBtn.addEventListener('click', () => this.cancelEdit());
    }

    handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);

        if (this.currentEditId) {
            this.updateUser(this.currentEditId, userData);
        } else {
            this.addUser(userData);
        }
    }

    addUser(userData) {
        const newUser = {
            id: this.nextId++,
            ...userData,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };

        // Check for duplicate email
        if (this.users.some(user => user.email === userData.email)) {
            alert('A user with this email already exists!');
            return;
        }

        this.users.push(newUser);
        this.clearForm();
        this.updateStats();
        this.renderUsers();
        this.showNotification('User added successfully!', 'success');
    }

    updateUser(id, userData) {
        const userIndex = this.users.findIndex(user => user.id === id);
        if (userIndex !== -1) {
            // Check for duplicate email (excluding current user)
            if (this.users.some(user => user.email === userData.email && user.id !== id)) {
                alert('A user with this email already exists!');
                return;
            }

            this.users[userIndex] = {
                ...this.users[userIndex],
                ...userData
            };
            
            this.cancelEdit();
            this.updateStats();
            this.renderUsers();
            this.showNotification('User updated successfully!', 'success');
        }
    }

    editUser(id) {
        const user = this.users.find(user => user.id === id);
        if (user) {
            this.currentEditId = id;
            this.populateForm(user);
        }
    }

    deleteUser(id) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.users = this.users.filter(user => user.id !== id);
            this.updateStats();
            this.renderUsers();
            this.showNotification('User deleted successfully!', 'success');
        }
    }

    populateForm(user) {
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('lastName').value = user.lastName;
        document.getElementById('email').value = user.email;
        document.getElementById('phone').value = user.phone;
        document.getElementById('userType').value = user.userType;
        document.getElementById('status').value = user.status;
        
        document.getElementById('formTitle').textContent = 'Edit User';
        document.getElementById('submitBtn').textContent = 'Update User';
        document.getElementById('cancelBtn').style.display = 'block';
    }

    clearForm() {
        document.getElementById('userForm').reset();
        this.cancelEdit();
    }

    cancelEdit() {
        this.currentEditId = null;
        document.getElementById('formTitle').textContent = 'Add New User';
        document.getElementById('submitBtn').textContent = 'Add User';
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('userForm').reset();
    }

    handleSearch(query) {
        const filteredUsers = this.users.filter(user => 
            user.firstName.toLowerCase().includes(query.toLowerCase()) ||
            user.lastName.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            user.userType.toLowerCase().includes(query.toLowerCase())
        );
        this.renderUsers(filteredUsers);
    }

    updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.status === 'active').length;
        const today = new Date().toDateString();
        const newUsersToday = this.users.filter(user => 
            new Date(user.createdAt).toDateString() === today
        ).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('newUsersToday').textContent = newUsersToday;
    }

    renderUsers(usersToRender = null) {
        const usersList = document.getElementById('usersList');
        const users = usersToRender || this.users;

        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.3;">👥</div>
                    <h3>${usersToRender ? 'No users found' : 'No users registered yet'}</h3>
                    <p>${usersToRender ? 'Try adjusting your search criteria' : 'Add your first user using the form on the left'}</p>
                </div>
            `;
            return;
        }

        const usersHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-details">
                        <h3>${user.firstName} ${user.lastName}</h3>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Phone:</strong> ${user.phone}</p>
                        <p><strong>Type:</strong> ${user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}</p>
                        <p><strong>Status:</strong> <span style="color: ${user.status === 'active' ? '#27ae60' : '#e74c3c'}">${user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span></p>
                        <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-small" onclick="userManager.editUser(${user.id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="userManager.deleteUser(${user.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

        usersList.innerHTML = usersHTML;
    }

    showNotification(message, type = 'info') {
        // Simple notification - can be enhanced later
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            border-radius: 5px;
            z-index: 1000;
            font-weight: 600;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Method to get all users (for future features)
    getAllUsers() {
        return this.users;
    }

    // Method to get users by type (for future features)
    getUsersByType(type) {
        return this.users.filter(user => user.userType === type);
    }

    // Method to get user by ID (for future features)
    getUserById(id) {
        return this.users.find(user => user.id === id);
    }
}

// Initialize the user manager
const userManager = new UserManager();

// Add some sample data for demonstration
setTimeout(() => {
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
        }
    ];

    sampleUsers.forEach(user => userManager.addUser(user));
}, 1000);