import supabaseClient from './supabase-client.js';

class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.selectedPins = new Set();
        this.allPins = [];
        this.filteredPins = [];
        this.sortBy = 'created_at';
        this.searchTerm = '';
        this.subscription = null;
        this.elements = {};
        this.confirmModal = null;
        this.stats = {
            totalPins: 0,
            todayPins: 0,
            uniqueAuthors: 0
        };
    }

    /**
     * Initialize admin dashboard
     */
    async initialize() {
        try {
            console.log('👑 Initializing Admin Dashboard...');
            
            // Initialize Supabase client
            await supabaseClient.initialize();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Check if already authenticated
            this.checkAuthStatus();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Admin Dashboard initialized');
        } 
        catch (error) {
            console.error('❌ Failed to initialize Admin Dashboard:', error);
            this.showToast('Failed to initialize admin dashboard', 'error');
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Login elements
            loginScreen: document.getElementById('login-screen'),
            loginForm: document.getElementById('login-form'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            loginError: document.getElementById('login-error'),
            
            // Dashboard elements
            adminDashboard: document.getElementById('admin-dashboard'),
            adminName: document.getElementById('admin-name'),
            logoutBtn: document.getElementById('logout-btn'),
            
            // Stats elements
            totalPins: document.getElementById('total-pins'),
            todayPins: document.getElementById('today-pins'),
            uniqueAuthors: document.getElementById('unique-authors'),
            
            // Controls elements
            adminSearch: document.getElementById('admin-search'),
            sortBy: document.getElementById('sort-by'),
            selectAllBtn: document.getElementById('select-all-btn'),
            deselectAllBtn: document.getElementById('deselect-all-btn'),
            bulkDeleteBtn: document.getElementById('bulk-delete-btn'),
            deleteAllBtn: document.getElementById('delete-all-btn'),
            selectedCount: document.getElementById('selected-count'),
            
            // Pins list elements
            adminLoading: document.getElementById('admin-loading'),
            adminEmpty: document.getElementById('admin-empty'),
            adminPinsList: document.getElementById('admin-pins-list'),
            
            // Modal elements
            confirmModal: document.getElementById('confirm-modal'),
            confirmTitle: document.getElementById('confirm-title'),
            confirmMessage: document.getElementById('confirm-message'),
            confirmCancel: document.getElementById('confirm-cancel'),
            confirmYes: document.getElementById('confirm-yes'),
            
            // Toast container
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Check authentication status
     */
    checkAuthStatus() {
        const isAdmin = supabaseClient.isAdmin();
        
        if (isAdmin) {
            this.isAuthenticated = true;
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        this.elements.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout button
        this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
        
        // Search functionality
        this.elements.adminSearch?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Sort functionality
        this.elements.sortBy?.addEventListener('change', (e) => this.handleSort(e.target.value));
        
        // Bulk operations
        this.elements.selectAllBtn?.addEventListener('click', () => this.selectAllPins());
        this.elements.deselectAllBtn?.addEventListener('click', () => this.deselectAllPins());
        this.elements.bulkDeleteBtn?.addEventListener('click', () => this.confirmBulkDelete());
        this.elements.deleteAllBtn?.addEventListener('click', () => this.confirmDeleteAll());
        
        // Confirmation modal
        this.elements.confirmCancel?.addEventListener('click', () => this.hideConfirmModal());
        this.elements.confirmYes?.addEventListener('click', () => this.executeConfirmedAction());
        
        // Close modal on escape or outside click
        this.elements.confirmModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.confirmModal) {
                this.hideConfirmModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideConfirmModal();
            }
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.elements.usernameInput?.value.trim();
        const password = this.elements.passwordInput?.value;
        
        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }
        
        try {
            // Validate credentials
            const isValid = supabaseClient.validateAdminCredentials(username, password);
            
            if (isValid) {
                // Set admin session
                supabaseClient.setAdminSession(true);
                this.isAuthenticated = true;
                
                // Show dashboard
                this.showDashboard();
                
                this.showToast('Welcome back, Admin!', 'success');
            } else {
                this.showLoginError('Invalid username or password');
            }
        } 
        catch (error) {
            console.error('❌ Login error:', error);
            this.showLoginError('Login failed. Please try again.');
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        supabaseClient.setAdminSession(false);
        this.isAuthenticated = false;
        this.cleanup();
        this.showLogin();
        this.showToast('Logged out successfully', 'info');
    }

    /**
     * Show login screen
     */
    showLogin() {
        try {
            if (this.elements.loginScreen) {
                this.elements.loginScreen.style.display = 'flex';
            }
        } 
        catch (error) {
            console.error('❌ Error displaying login screen:', error);
        }
        
        try {
            if (this.elements.adminDashboard) {
                this.elements.adminDashboard.style.display = 'none';
            }
        } 
        catch (error) {
            console.error('❌ Error hiding admin dashboard:', error);
        }
        
        try {
            // Clear login form
            if (this.elements.loginForm) {
                this.elements.loginForm.reset();
            }
        } 
        catch (error) {
            console.error('❌ Error resetting login form:', error);
        }
        
        try {
            this.hideLoginError();
        } 
        catch (error) {
            console.error('❌ Error hiding login error:', error);
        }
        
        try {
            // Focus username field
            setTimeout(() => {
                try {
                    if (this.elements.usernameInput) {
                        this.elements.usernameInput.focus();
                    }
                } catch (error) {
                    console.error('❌ Error focusing username input:', error);
                }
            }, 100);
        } 
        catch (error) {
            console.error('❌ Error setting timeout for focus:', error);
        }
    }

    /**
     * Show admin dashboard
     */
    async showDashboard() {
        try {
            if (this.elements.loginScreen) {
                this.elements.loginScreen.style.display = 'none';
            }
        } 
        catch (error) {
            console.error('❌ Error hiding login screen:', error);
        }
        
        try {
            if (this.elements.adminDashboard) {
                this.elements.adminDashboard.style.display = 'block';
            }
        } 
        catch (error) {
            console.error('❌ Error displaying admin dashboard:', error);
        }
        
        try {
            // Set admin name
            if (this.elements.adminName) {
                this.elements.adminName.textContent = 'RenZion';
            }
        } 
        catch (error) {
            console.error('❌ Error setting admin name:', error);
        }
        
        try {
            // Admin Dashboards
            await this.loadDashboardData();
        } 
        catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
        
        try {
            // real time subscription setup
            this.setupRealTimeSubscription();
        } 
        catch (error) {
            console.error('❌ Error setting up real-time subscription:', error);
            this.showToast('Failed to set up real-time updates', 'error');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.showAdminLoading();
            
            // Load pins and statistics
            await Promise.all([
                this.loadPins(),
                this.loadStatistics()
            ]);
            
            this.hideAdminLoading();
        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
            this.hideAdminLoading();
        }
    }

    /**
     * Load all pins
     */
    async loadPins() {
        try {
            const pins = await supabaseClient.getPins();
            this.allPins = pins;
            this.applyFiltersAndSort();
            this.renderPins();
        } catch (error) {
            console.error('❌ Failed to load pins:', error);
            throw error;
        }
    }

    /**
     * Load statistics
     */
    async loadStatistics() {
        try {
            this.stats = await supabaseClient.getPinStats();
            this.updateStatsDisplay();
        } catch (error) {
            console.error('❌ Failed to load statistics:', error);
            // Use fallback stats
            this.stats = {
                totalPins: this.allPins.length,
                todayPins: 0,
                uniqueAuthors: 0
            };
            this.updateStatsDisplay();
        }
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        if (this.elements.totalPins) {
            this.elements.totalPins.textContent = this.stats.totalPins.toString();
        }
        
        if (this.elements.todayPins) {
            this.elements.todayPins.textContent = this.stats.todayPins.toString();
        }
        
        if (this.elements.uniqueAuthors) {
            this.elements.uniqueAuthors.textContent = this.stats.uniqueAuthors.toString();
        }
    }

    /**
     * Apply filters and sorting
     */
    applyFiltersAndSort() {
        let filtered = [...this.allPins];
        
        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(pin => 
                pin.title.toLowerCase().includes(term) ||
                pin.content.toLowerCase().includes(term) ||
                pin.author.toLowerCase().includes(term)
            );
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'created_at':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'created_at_asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'author':
                    return a.author.localeCompare(b.author);
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        this.filteredPins = filtered;
    }

    /**
     * Render pins in admin list
     */
    renderPins() {
        if (!this.elements.adminPinsList) return;
        
        // Clear existing pins
        this.elements.adminPinsList.innerHTML = '';
        
        if (this.filteredPins.length === 0) {
            this.showAdminEmpty();
            return;
        }
        
        this.hideAdminEmpty();
        
        // Render each pin
        this.filteredPins.forEach(pin => {
            const pinElement = this.createAdminPinElement(pin);
            this.elements.adminPinsList.appendChild(pinElement);
        });
        
        // Update selection UI
        this.updateSelectionUI();
    }

    /**
     * Create admin pin element
     */
    createAdminPinElement(pin) {
        const pinDiv = document.createElement('div');
        pinDiv.className = 'admin-pin-item';
        pinDiv.dataset.pinId = pin.id;
        
        if (this.selectedPins.has(pin.id)) {
            pinDiv.classList.add('selected');
        }
        
        const formattedDate = this.formatDate(pin.created_at);
        const isSelected = this.selectedPins.has(pin.id);
        
        pinDiv.innerHTML = `
            <div class="admin-pin-header">
                <div class="admin-pin-info">
                    <h3 class="admin-pin-title">${this.escapeHtml(pin.title)}</h3>
                    <div class="admin-pin-meta">
                        <span class="admin-pin-author">
                            <i class="fas fa-user"></i>
                            ${this.escapeHtml(pin.author || 'Anonymous')}
                        </span>
                        <span class="admin-pin-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate}
                        </span>
                    </div>
                </div>
                <div class="admin-pin-controls">
                    <div class="admin-pin-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''}>
                        <i class="fas fa-check"></i>
                    </div>
                </div>
            </div>
            <div class="admin-pin-content">${this.escapeHtml(pin.content)}</div>
            <div class="admin-pin-actions">
                <button class="btn btn-danger btn-sm delete-pin" data-pin-id="${pin.id}">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        
        // Add event listeners
        const checkbox = pinDiv.querySelector('input[type="checkbox"]');
        checkbox?.addEventListener('change', (e) => {
            this.togglePinSelection(pin.id, e.target.checked);
        });
        
        const deleteBtn = pinDiv.querySelector('.delete-pin');
        deleteBtn?.addEventListener('click', () => {
            this.confirmDeletePin(pin.id);
        });
        
        // Add click handler for row selection
        pinDiv.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                checkbox.checked = !checkbox.checked;
                this.togglePinSelection(pin.id, checkbox.checked);
            }
        });
        
        return pinDiv;
    }

    /**
     * Toggle pin selection
     */
    togglePinSelection(pinId, selected) {
        if (selected) {
            this.selectedPins.add(pinId);
        } else {
            this.selectedPins.delete(pinId);
        }
        
        // Update visual state
        const pinElement = document.querySelector(`[data-pin-id="${pinId}"]`);
        if (pinElement) {
            pinElement.classList.toggle('selected', selected);
        }
        
        this.updateSelectionUI();
    }

    /**
     * Select all pins
     */
    selectAllPins() {
        this.filteredPins.forEach(pin => {
            this.selectedPins.add(pin.id);
        });
        
        // Update checkboxes
        this.elements.adminPinsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Update visual state
        this.elements.adminPinsList.querySelectorAll('.admin-pin-item').forEach(item => {
            item.classList.add('selected');
        });
        
        this.updateSelectionUI();
    }

    /**
     * Deselect all pins
     */
    deselectAllPins() {
        this.selectedPins.clear();
        
        // Update checkboxes
        this.elements.adminPinsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Update visual state
        this.elements.adminPinsList.querySelectorAll('.admin-pin-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.updateSelectionUI();
    }

    /**
     * Update selection UI
     */
    updateSelectionUI() {
        const selectedCount = this.selectedPins.size;
        
        if (this.elements.selectedCount) {
            this.elements.selectedCount.textContent = selectedCount.toString();
        }
        
        if (this.elements.bulkDeleteBtn) {
            this.elements.bulkDeleteBtn.disabled = selectedCount === 0;
        }
    }

    /**
     * Handle search
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.trim();
        this.applyFiltersAndSort();
        this.renderPins();
    }

    /**
     * Handle sort change
     */
    handleSort(sortBy) {
        this.sortBy = sortBy;
        this.applyFiltersAndSort();
        this.renderPins();
    }

    /**
     * Confirm delete single pin
     */
    confirmDeletePin(pinId) {
        const pin = this.allPins.find(p => p.id === pinId);
        if (!pin) return;
        
        this.showConfirmModal(
            'Delete Pin',
            `Are you sure you want to delete "${pin.title}"? This action cannot be undone.`,
            () => this.deletePin(pinId)
        );
    }

    /**
     * Confirm bulk delete
     */
    confirmBulkDelete() {
        const count = this.selectedPins.size;
        if (count === 0) return;
        
        this.showConfirmModal(
            'Delete Selected Pins',
            `Are you sure you want to delete ${count} selected pin${count === 1 ? '' : 's'}? This action cannot be undone.`,
            () => this.deleteBulkPins()
        );
    }

    /**
     * Confirm delete all
     */
    confirmDeleteAll() {
        const count = this.allPins.length;
        if (count === 0) return;
        
        this.showConfirmModal(
            'Delete All Pins',
            `Are you sure you want to delete ALL ${count} pins? This action cannot be undone and will permanently remove all content from the corkboard.`,
            () => this.deleteAllPins()
        );
    }

    /**
     * Delete single pin
     */
    async deletePin(pinId) {
        try {
            await supabaseClient.deletePin(pinId);
            
            // Remove from local arrays
            this.allPins = this.allPins.filter(pin => pin.id !== pinId);
            this.selectedPins.delete(pinId);
            
            this.applyFiltersAndSort();
            this.renderPins();
            await this.loadStatistics();
            
            this.showToast('Pin deleted successfully', 'success');
        } catch (error) {
            console.error('❌ Failed to delete pin:', error);
            this.showToast('Failed to delete pin', 'error');
        }
    }

    /**
     * Delete bulk pins
     */
    async deleteBulkPins() {
        try {
            const pinIds = Array.from(this.selectedPins);
            await supabaseClient.deletePins(pinIds);
            
            // Remove from local arrays
            this.allPins = this.allPins.filter(pin => !pinIds.includes(pin.id));
            this.selectedPins.clear();
            
            this.applyFiltersAndSort();
            this.renderPins();
            await this.loadStatistics();
            
            this.showToast(`${pinIds.length} pins deleted successfully`, 'success');
        } catch (error) {
            console.error('❌ Failed to delete pins:', error);
            this.showToast('Failed to delete selected pins', 'error');
        }
    }

    /**
     * Delete all pins
     */
    async deleteAllPins() {
        try {
            await supabaseClient.deleteAllPins();
            
            // Clear local arrays
            this.allPins = [];
            this.selectedPins.clear();
            
            this.applyFiltersAndSort();
            this.renderPins();
            await this.loadStatistics();
            
            this.showToast('All pins deleted successfully', 'success');
        } catch (error) {
            console.error('❌ Failed to delete all pins:', error);
            this.showToast('Failed to delete all pins', 'error');
        }
    }

    /**
     * Show confirmation modal
     */
    showConfirmModal(title, message, confirmAction) {
        if (!this.elements.confirmModal) return;
        
        this.pendingConfirmAction = confirmAction;
        
        if (this.elements.confirmTitle) {
            this.elements.confirmTitle.textContent = title;
        }
        
        if (this.elements.confirmMessage) {
            this.elements.confirmMessage.textContent = message;
        }
        
        this.elements.confirmModal.style.display = 'block';
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus confirm button
        setTimeout(() => {
            this.elements.confirmYes?.focus();
        }, 100);
    }

    /**
     * Hide confirmation modal
     */
    hideConfirmModal() {
        if (!this.elements.confirmModal) return;
        
        this.elements.confirmModal.style.display = 'none';
        this.pendingConfirmAction = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Execute confirmed action
     */
    async executeConfirmedAction() {
        if (this.pendingConfirmAction) {
            try {
                await this.pendingConfirmAction();
                this.hideConfirmModal();
            } catch (error) {
                console.error('❌ Error executing confirmed action:', error);
                this.showToast(error.message || 'Action failed', 'error');
                this.hideConfirmModal();
            }
        }
    }

    /**
     * Setup real-time subscription
     */
    setupRealTimeSubscription() {
        try {
            this.subscription = supabaseClient.subscribeToPins((payload) => {
                this.handleRealTimeUpdate(payload);
            });
        } catch (error) {
            console.error('❌ Failed to setup real-time subscription:', error);
        }
    }

    /**
     * Handle real-time updates
     */
    async handleRealTimeUpdate(payload) {
        console.log('📡 Admin real-time update:', payload.eventType);
        
        // Reload data to ensure consistency
        await this.loadDashboardData();
    }

    /**
     * Show/hide loading states
     */
    showAdminLoading() {
        if (this.elements.adminLoading) {
            this.elements.adminLoading.style.display = 'block';
        }
        if (this.elements.adminPinsList) {
            this.elements.adminPinsList.style.display = 'none';
        }
        if (this.elements.adminEmpty) {
            this.elements.adminEmpty.style.display = 'none';
        }
    }

    hideAdminLoading() {
        if (this.elements.adminLoading) {
            this.elements.adminLoading.style.display = 'none';
        }
        if (this.elements.adminPinsList) {
            this.elements.adminPinsList.style.display = 'block';
        }
    }

    showAdminEmpty() {
        if (this.elements.adminEmpty) {
            this.elements.adminEmpty.style.display = 'block';
        }
        if (this.elements.adminPinsList) {
            this.elements.adminPinsList.style.display = 'none';
        }
    }

    hideAdminEmpty() {
        if (this.elements.adminEmpty) {
            this.elements.adminEmpty.style.display = 'none';
        }
    }

    /**
     * Show login error
     */
    showLoginError(message) {
        if (this.elements.loginError) {
            this.elements.loginError.textContent = message;
            this.elements.loginError.style.display = 'block';
        }
    }

    /**
     * Hide login error
     */
    hideLoginError() {
        if (this.elements.loginError) {
            this.elements.loginError.style.display = 'none';
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        if (!this.elements.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.subscription) {
            supabaseClient.unsubscribe(this.subscription);
            this.subscription = null;
        }
        
        this.selectedPins.clear();
        this.allPins = [];
        this.filteredPins = [];
    }

    /**
     * Destroy admin manager
     */
    destroy() {
        this.cleanup();
        console.log('🧹 Admin Manager cleaned up');
    }
}

// Create and initialize admin manager
const adminManager = new AdminManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminManager.initialize().catch(error => {
            console.error('❌ Failed to initialize admin dashboard:', error);
        });
    });
} 
else {
    adminManager.initialize().catch(error => {
        console.error('❌ Failed to initialize admin dashboard:', error);
    });
}

// Make available globally
window.adminManager = adminManager;

export default adminManager;
