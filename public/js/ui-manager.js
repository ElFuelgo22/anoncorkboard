/**
 * UI Manager Module
 * Handles all user interface operations and interactions
 */

class UIManager {
    constructor() {
        this.elements = {};
        this.modal = null;
        this.isModalOpen = false;
        this.editingPinId = null;
        this.toastQueue = [];
        this.maxToasts = 3;
        this.initialized = false;
    }

    /**
     * Initialize UI Manager
     */
    initialize() {
        try {
            console.log('🎨 Initializing UI Manager...');
            
            this.cacheElements();
            this.setupEventListeners();
            this.setupModal();
            this.updateUI();
            
            this.initialized = true;
            console.log('✅ UI Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // Header elements
            addPinBtn: document.getElementById('add-pin-btn'),
            
            // Search elements
            searchInput: document.getElementById('search-input'),
            clearSearchBtn: document.getElementById('clear-search'),
            pinCount: document.getElementById('pin-count'),
            
            // State elements
            loading: document.getElementById('loading'),
            errorState: document.getElementById('error-state'),
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),
            emptyState: document.getElementById('empty-state'),
            emptyAddPin: document.getElementById('empty-add-pin'),
            
            // Pins grid
            pinsGrid: document.getElementById('pins-grid'),
            
            // Modal elements
            modal: document.getElementById('pin-modal'),
            modalTitle: document.getElementById('modal-title'),
            closeModal: document.getElementById('close-modal'),
            pinForm: document.getElementById('pin-form'),
            pinTitle: document.getElementById('pin-title'),
            pinContent: document.getElementById('pin-content'),
            pinNickname: document.getElementById('pin-nickname'),
            pinRpName: document.getElementById('pin-rp-name'),
            pinMain: document.getElementById('pin-main'),
            cancelBtn: document.getElementById('cancel-btn'),
            submitBtn: document.getElementById('submit-btn'),
            
            // Toast container
            toastContainer: document.getElementById('toast-container')
        };

        // Validate required elements
        const requiredElements = [
            'addPinBtn', 'searchInput', 'loading', 'pinsGrid', 
            'modal', 'pinForm', 'toastContainer'
        ];
        
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                throw new Error(`Required element not found: ${elementName}`);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add pin button
        this.elements.addPinBtn?.addEventListener('click', () => this.openAddPinModal());
        
        // Empty state add pin button
        this.elements.emptyAddPin?.addEventListener('click', () => this.openAddPinModal());
        
        // Search functionality
        this.elements.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.elements.clearSearchBtn?.addEventListener('click', () => this.clearSearch());
        
        // Retry button
        this.elements.retryBtn?.addEventListener('click', () => this.handleRetry());
        
        // Form submission
        this.elements.pinForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Cancel button
        this.elements.cancelBtn?.addEventListener('click', () => this.closeModal());
        
        // Character count for form fields
        this.setupCharacterCounters();
        
        // Modal close events
        this.setupModalCloseEvents();
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Click outside modal to close
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });
    }

    /**
     * Setup modal functionality
     */
    setupModal() {
        if (!this.elements.modal) return;
        
        this.modal = {
            element: this.elements.modal,
            isOpen: false,
            originalFocus: null
        };
    }

    /**
     * Setup character counters for form fields
     */
    setupCharacterCounters() {
        const fields = [
            { element: this.elements.pinTitle, maxLength: 100 },
            { element: this.elements.pinContent, maxLength: 500 },
            { element: this.elements.pinNickname, maxLength: 30 },
            { element: this.elements.pinRpName, maxLength: 30 }
        ];

        fields.forEach(({ element, maxLength }) => {
            if (!element) return;
            
            const counter = element.parentElement?.querySelector('.char-count');
            if (counter) {
                element.addEventListener('input', () => {
                    const length = element.value.length;
                    counter.textContent = `${length}/${maxLength}`;
                    counter.style.color = length > maxLength * 0.9 ? '#e74c3c' : '';
                });
            }
        });
    }

    /**
     * Setup modal close events
     */
    setupModalCloseEvents() {
        this.elements.closeModal?.addEventListener('click', () => this.closeModal());
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to submit form when modal is open
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isModalOpen) {
            e.preventDefault();
            this.handleFormSubmit(e);
        }
        
        // 'N' key to open new pin modal (when not typing)
        if (e.key === 'n' && !this.isModalOpen && !this.isTyping(e.target)) {
            e.preventDefault();
            this.openAddPinModal();
        }
    }

    /**
     * Check if user is currently typing in an input field
     */
    isTyping(target) {
        return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    }

    /**
     * Render pins in the grid
     */
    renderPins(pins) {
        if (!this.elements.pinsGrid) return;
        
        this.hideAllStates();
        
        if (pins.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.elements.pinsGrid.innerHTML = '';
        
        pins.forEach(pin => {
            const pinElement = this.createPinElement(pin);
            this.elements.pinsGrid.appendChild(pinElement);
        });
        
        this.updatePinCount(pins.length);
        this.elements.pinsGrid.style.display = 'grid';
        
        // Add animation to newly rendered pins
        this.animatePins();
    }

    /**
     * Create a pin element
     */
    createPinElement(pin) {
        const pinDiv = document.createElement('div');
        pinDiv.className = 'pin';
        pinDiv.dataset.pinId = pin.id;
        
        const isOwner = window.pinManager?.isOwner(pin) || false;
        const formattedDate = window.pinManager?.formatPinDate(pin.created_at) || 'Unknown';
        
        pinDiv.innerHTML = `
            <div class="pin-header">
                <h3 class="pin-title">${this.escapeHtml(pin.title)}</h3>
                ${isOwner ? `
                <div class="pin-actions">
                    <button class="pin-action edit" title="Edit pin" data-pin-id="${pin.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="pin-action delete" title="Delete pin" data-pin-id="${pin.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ` : ''}
            </div>
            <div class="pin-content">${this.escapeHtml(pin.content)}</div>
            <div class="pin-footer">
                <span class="pin-author">
                    <i class="fas fa-user"></i>
                    ${this.escapeHtml(pin.nickname || 'Anonymous')}
                </span>
                <span class="pin-date">
                    <i class="fas fa-clock"></i>
                    ${formattedDate}
                </span>
            </div>
        `;
        
        // Add event listeners for pin actions
        if (isOwner) {
            const editBtn = pinDiv.querySelector('.pin-action.edit');
            const deleteBtn = pinDiv.querySelector('.pin-action.delete');
            
            editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditPinModal(pin);
            });
            
            deleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeletePin(pin.id);
            });
        }
        
        // Add click animation
        pinDiv.addEventListener('click', () => {
            pinDiv.style.transform = 'scale(0.98)';
            setTimeout(() => {
                pinDiv.style.transform = '';
            }, 150);
        });
        
        return pinDiv;
    }

    /**
     * Animate pins on render
     */
    animatePins() {
        const pins = this.elements.pinsGrid.querySelectorAll('.pin');
        pins.forEach((pin, index) => {
            pin.style.opacity = '0';
            pin.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                pin.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                pin.style.opacity = '1';
                pin.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    /**
     * Open add pin modal
     */
    openAddPinModal() {
        this.editingPinId = null;
        this.elements.modalTitle.textContent = 'Add New Pin';
        this.elements.submitBtn.innerHTML = '<i class="fas fa-thumbtack"></i> Pin It';
        this.resetForm();
        this.openModal();
    }

    /**
     * Open edit pin modal
     */
    openEditPinModal(pin) {
        this.editingPinId = pin.id;
        this.elements.modalTitle.textContent = 'Edit Pin';
        this.elements.submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        
        // Populate form with existing data
        this.elements.pinTitle.value = pin.title;
        this.elements.pinContent.value = pin.content;
        this.elements.pinNickname.value = pin.nickname || '';
        this.elements.pinRpName.value = pin.rp_name || '';
        this.elements.pinMain.value = pin.main_number || '';
        
        // Update character counters
        this.updateCharacterCounters();
        
        this.openModal();
    }

    /**
     * Open modal
     */
    openModal() {
        if (!this.elements.modal) return;
        
        this.isModalOpen = true;
        this.modal.originalFocus = document.activeElement;
        
        this.elements.modal.style.display = 'block';
        
        // Accessibility: trap focus in modal
        setTimeout(() => {
            this.elements.pinTitle?.focus();
        }, 100);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    closeModal() {
        if (!this.elements.modal) return;
        
        this.isModalOpen = false;
        this.editingPinId = null;
        
        this.elements.modal.style.display = 'none';
        this.resetForm();
        
        // Restore focus
        if (this.modal.originalFocus) {
            this.modal.originalFocus.focus();
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Reset form
     */
    resetForm() {
        if (!this.elements.pinForm) return;
        
        this.elements.pinForm.reset();
        this.updateCharacterCounters();
        
        // Clear validation states
        const inputs = this.elements.pinForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    }

    /**
     * Update character counters
     */
    updateCharacterCounters() {
        const fields = [
            { element: this.elements.pinTitle, maxLength: 100 },
            { element: this.elements.pinContent, maxLength: 500 },
            { element: this.elements.pinNickname, maxLength: 30 },
            { element: this.elements.pinRpName, maxLength: 30 }
        ];

        fields.forEach(({ element, maxLength }) => {
            if (!element) return;
            
            const counter = element.parentElement?.querySelector('.char-count');
            if (counter) {
                const length = element.value.length;
                counter.textContent = `${length}/${maxLength}`;
                counter.style.color = length > maxLength * 0.9 ? '#e74c3c' : '';
            }
        });
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!window.pinManager) {
            this.showToast('Pin manager not initialized', 'error');
            return;
        }
        
        // Get form data
        const formData = new FormData(this.elements.pinForm);
        const pinData = {
            title: formData.get('title')?.trim() || '',
            content: formData.get('content')?.trim() || '',
            nickname: formData.get('nickname')?.trim() || 'Anonymous',
            rp_name: formData.get('rp_name')?.trim() || '',
            main_number: parseInt(formData.get('main_number')) || null
        };
        
        // Client-side validation
        if (!this.validateForm(pinData)) {
            return;
        }
        
        // Disable submit button
        this.elements.submitBtn.disabled = true;
        this.elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            if (this.editingPinId) {
                await window.pinManager.updatePin(this.editingPinId, pinData);
                this.showToast('Pin updated successfully!', 'success');
            } else {
                await window.pinManager.createPin(pinData);
                this.showToast('Pin created successfully!', 'success');
            }
            
            this.closeModal();
        } catch (error) {
            console.error('Form submission error:', error);
            this.showToast(error.message || 'Failed to save pin', 'error');
        } finally {
            // Re-enable submit button
            this.elements.submitBtn.disabled = false;
            this.elements.submitBtn.innerHTML = this.editingPinId ? 
                '<i class="fas fa-save"></i> Save Changes' : 
                '<i class="fas fa-thumbtack"></i> Pin It';
        }
    }

    /**
     * Validate form data
     */
    validateForm(data) {
        let isValid = true;
        
        // Clear previous validation states
        const inputs = this.elements.pinForm.querySelectorAll('input, textarea');
        inputs.forEach(input => input.classList.remove('error'));
        
        // Validate title
        if (!data.title) {
            this.elements.pinTitle.classList.add('error');
            this.showToast('Title is required', 'error');
            isValid = false;
        } else if (data.title.length > 100) {
            this.elements.pinTitle.classList.add('error');
            this.showToast('Title must be 100 characters or less', 'error');
            isValid = false;
        }
        
        // Validate content
        if (!data.content) {
            this.elements.pinContent.classList.add('error');
            this.showToast('Content is required', 'error');
            isValid = false;
        } else if (data.content.length > 500) {
            this.elements.pinContent.classList.add('error');
            this.showToast('Content must be 500 characters or less', 'error');
            isValid = false;
        }
        
        // Validate RP name
        if (!data.rp_name) {
            this.elements.pinRpName.classList.add('error');
            this.showToast('RP name is required', 'error');
            isValid = false;
        } else if (data.rp_name.length > 30) {
            this.elements.pinRpName.classList.add('error');
            this.showToast('RP name must be 30 characters or less', 'error');
            isValid = false;
        }
        
        // Validate main selection
        if (!data.main_number) {
            this.elements.pinMain.classList.add('error');
            this.showToast('Main selection is required', 'error');
            isValid = false;
        }
        
        // Validate nickname length
        if (data.nickname && data.nickname.length > 30) {
            this.elements.pinNickname.classList.add('error');
            this.showToast('Nickname must be 30 characters or less', 'error');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Confirm pin deletion
     */
    async confirmDeletePin(pinId) {
        if (!window.pinManager) return;
        
        const confirmed = confirm('Are you sure you want to delete this pin? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await window.pinManager.deletePin(pinId);
            this.showToast('Pin deleted successfully', 'success');
        } catch (error) {
            console.error('Delete pin error:', error);
            this.showToast(error.message || 'Failed to delete pin', 'error');
        }
    }

    /**
     * Handle search input
     */
    handleSearch(searchTerm) {
        if (!window.pinManager) return;
        
        window.pinManager.searchPins(searchTerm);
        
        // Show/hide clear button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (!window.pinManager) return;
        
        this.elements.searchInput.value = '';
        window.pinManager.clearSearch();
        
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = 'none';
        }
    }

    /**
     * Handle retry button click
     */
    async handleRetry() {
        if (!window.pinManager) return;
        
        this.showLoading();
        
        try {
            await window.pinManager.loadPins();
        } catch (error) {
            this.showError(error);
        }
    }

    /**
     * Update pin count display
     */
    updatePinCount(count) {
        if (this.elements.pinCount) {
            this.elements.pinCount.textContent = `${count} ${count === 1 ? 'pin' : 'pins'}`;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.hideAllStates();
        if (this.elements.loading) {
            this.elements.loading.style.display = 'block';
        }
    }

    /**
     * Show error state
     */
    showError(error) {
        this.hideAllStates();
        
        if (this.elements.errorState) {
            this.elements.errorState.style.display = 'block';
        }
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = error.message || 'An unexpected error occurred';
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.hideAllStates();
        
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
        
        this.updatePinCount(0);
    }

    /**
     * Hide all states
     */
    hideAllStates() {
        const states = [
            this.elements.loading,
            this.elements.errorState,
            this.elements.emptyState,
            this.elements.pinsGrid
        ];
        
        states.forEach(element => {
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        // This method can be called to refresh the UI
        // Currently handled by pin manager events
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        if (!this.elements.toastContainer) return;
        
        // Limit number of toasts
        const existingToasts = this.elements.toastContainer.querySelectorAll('.toast');
        if (existingToasts.length >= this.maxToasts) {
            existingToasts[0].remove();
        }
        
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
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners if needed
        this.initialized = false;
        console.log('🧹 UI Manager cleaned up');
    }
}

// Create and export singleton instance
const uiManager = new UIManager();

// Make it available globally
window.uiManager = uiManager;

export default uiManager;
