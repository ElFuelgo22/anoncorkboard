/**
 * Pin Manager Module
 * Handles all pin-related operations and business logic
 */

import supabaseClient from './supabase-client.js';

class PinManager {
    constructor() {
        this.pins = [];
        this.filteredPins = [];
        this.searchTerm = '';
        this.currentFilter = 'all';
        this.subscription = null;
        this.editingPin = null;
        this.listeners = {
            pinsUpdated: [],
            pinCreated: [],
            pinUpdated: [],
            pinDeleted: [],
            error: []
        };
    }

    /**
     * Initialize the pin manager
     */
    async initialize() {
        try {
            console.log('🔧 Initializing Pin Manager...');
            
            // Initialize Supabase client
            await supabaseClient.initialize();
            
            // Load initial pins
            await this.loadPins();
            
            // Subscribe to real-time updates
            this.setupRealTimeSubscription();
            
            console.log('✅ Pin Manager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Pin Manager:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Load all pins from the database
     */
    async loadPins() {
        try {
            console.log('📥 Loading pins...');
            
            const pins = await supabaseClient.getPins();
            this.pins = pins;
            this.applyFilters();
            
            console.log(`✅ Loaded ${pins.length} pins`);
            this.emit('pinsUpdated', this.filteredPins);
            
            return pins;
        } catch (error) {
            console.error('❌ Failed to load pins:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Create a new pin
     */
    async createPin(pinData) {
        try {
            console.log('📌 Creating new pin...');
            
            // Validate pin data
            this.validatePinData(pinData);
            
            // Create pin in database
            const newPin = await supabaseClient.createPin(pinData);
            
            // Add to local pins array
            this.pins.unshift(newPin);
            this.applyFilters();
            
            console.log('✅ Pin created successfully');
            this.emit('pinCreated', newPin);
            this.emit('pinsUpdated', this.filteredPins);
            
            return newPin;
        } 
        catch (error) {
            console.error('❌ Failed to create pin:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Update an existing pin
     */
    async updatePin(pinId, updates) {
        try {
            console.log('📝 Updating pin:', pinId);
            
            // Validate updates
            this.validatePinData(updates);
            
            // Get current author ID
            const authorId = supabaseClient.getCurrentAuthorId();
            
            // Update pin in database
            const updatedPin = await supabaseClient.updatePin(pinId, updates, authorId);
            
            // Update local pins array
            const index = this.pins.findIndex(pin => pin.id === pinId);
            if (index !== -1) {
                this.pins[index] = updatedPin;
                this.applyFilters();
            }
            
            console.log('✅ Pin updated successfully');
            this.emit('pinUpdated', updatedPin);
            this.emit('pinsUpdated', this.filteredPins);
            
            return updatedPin;
        } catch (error) {
            console.error('❌ Failed to update pin:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Delete a pin
     */
    async deletePin(pinId, skipOwnershipCheck = false) {
        try {
            console.log('🗑️ Deleting pin:', pinId);
            
            // Get author ID for ownership check (unless skipped for admin)
            const authorId = skipOwnershipCheck ? null : supabaseClient.getCurrentAuthorId();
            
            // Delete pin from database
            await supabaseClient.deletePin(pinId, authorId);
            
            // Remove from local pins array
            this.pins = this.pins.filter(pin => pin.id !== pinId);
            this.applyFilters();
            
            console.log('✅ Pin deleted successfully');
            this.emit('pinDeleted', pinId);
            this.emit('pinsUpdated', this.filteredPins);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete pin:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Delete multiple pins (admin only)
     */
    async deletePins(pinIds) {
        try {
            console.log('🗑️ Deleting multiple pins:', pinIds.length);
            
            if (!supabaseClient.isAdmin()) {
                throw new Error('Admin access required');
            }
            
            // Delete pins from database
            await supabaseClient.deletePins(pinIds);
            
            // Remove from local pins array
            this.pins = this.pins.filter(pin => !pinIds.includes(pin.id));
            this.applyFilters();
            
            console.log('✅ Pins deleted successfully');
            this.emit('pinsUpdated', this.filteredPins);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete pins:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Delete all pins (admin only)
     */
    async deleteAllPins() {
        try {
            console.log('🗑️ Deleting all pins...');
            
            if (!supabaseClient.isAdmin()) {
                throw new Error('Admin access required');
            }
            
            // Delete all pins from database
            await supabaseClient.deleteAllPins();
            
            // Clear local pins array
            this.pins = [];
            this.applyFilters();
            
            console.log('✅ All pins deleted successfully');
            this.emit('pinsUpdated', this.filteredPins);
            
            return true;
        } catch (error) {
            console.error('❌ Failed to delete all pins:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Search pins by title or content
     */
    searchPins(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();
        this.applyFilters();
        this.emit('pinsUpdated', this.filteredPins);
    }

    /**
     * Clear search filters
     */
    clearSearch() {
        this.searchTerm = '';
        this.applyFilters();
        this.emit('pinsUpdated', this.filteredPins);
    }

    /**
     * Apply current filters to pins
     */
    applyFilters() {
        let filtered = [...this.pins];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(pin => 
                pin.title.toLowerCase().includes(this.searchTerm) ||
                pin.content.toLowerCase().includes(this.searchTerm) ||
                (pin.nickname && pin.nickname.toLowerCase().includes(this.searchTerm))
            );
        }
        
        this.filteredPins = filtered;
    }

    /**
     * Get pin by ID
     */
    getPinById(pinId) {
        return this.pins.find(pin => pin.id === pinId);
    }

    /**
     * Check if current user owns a pin
     */
    isOwner(pin) {
        const currentAuthorId = supabaseClient.getCurrentAuthorId();
        return pin.author_id === currentAuthorId;
    }

    /**
     * Get pins owned by current user
     */
    getUserPins() {
        const currentAuthorId = supabaseClient.getCurrentAuthorId();
        return this.pins.filter(pin => pin.author_id === currentAuthorId);
    }

    /**
     * Format pin date for display
     */
    formatPinDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Validate pin data
     */
    validatePinData(data) {
        if (!data.title || !data.title.trim()) {
            throw new Error('Pin title is required');
        }
        
        if (!data.content || !data.content.trim()) {
            throw new Error('Pin content is required');
        }
        
        if (data.title.length > 100) {
            throw new Error('Pin title must be 100 characters or less');
        }
        
        if (data.content.length > 500) {
            throw new Error('Pin content must be 500 characters or less');
        }
        
        if (!data.rp_name || !data.rp_name.trim()) {
            throw new Error('RP name is required');
        }
        
        if (data.rp_name.length > 30) {
            throw new Error('RP name must be 30 characters or less');
        }
        
        if (!data.main_number || ![1, 2, 3, 4, 5].includes(data.main_number)) {
            throw new Error('Valid main selection (1-4 + Council) is required');
        }
        
        if (data.nickname && data.nickname.length > 30) {
            throw new Error('Nickname must be 30 characters or less');
        }
    }

    /**
     * Setup real-time subscription for pin updates
     */
    setupRealTimeSubscription() {
        try {
            this.subscription = supabaseClient.subscribeToPins((payload) => {
                this.handleRealTimeUpdate(payload);
            });
            
            console.log('📡 Real-time subscription established');
        } catch (error) {
            console.error('❌ Failed to setup real-time subscription:', error);
        }
    }

    /**
     * Handle real-time database updates
     */
    handleRealTimeUpdate(payload) {
        console.log('📡 Handling real-time update:', payload.eventType);
        
        switch (payload.eventType) {
            case 'INSERT':
                this.handlePinInserted(payload.new);
                break;
            case 'UPDATE':
                this.handlePinUpdated(payload.new);
                break;
            case 'DELETE':
                this.handlePinDeleted(payload.old);
                break;
        }
    }

    /**
     * Handle pin insertion from real-time update
     */
    handlePinInserted(newPin) {
        // Check if pin already exists (avoid duplicates)
        const existingIndex = this.pins.findIndex(pin => pin.id === newPin.id);
        if (existingIndex === -1) {
            this.pins.unshift(newPin);
            this.applyFilters();
            this.emit('pinsUpdated', this.filteredPins);
        }
    }

    /**
     * Handle pin update from real-time update
     */
    handlePinUpdated(updatedPin) {
        const index = this.pins.findIndex(pin => pin.id === updatedPin.id);
        if (index !== -1) {
            this.pins[index] = updatedPin;
            this.applyFilters();
            this.emit('pinsUpdated', this.filteredPins);
        }
    }

    /**
     * Handle pin deletion from real-time update
     */
    handlePinDeleted(deletedPin) {
        this.pins = this.pins.filter(pin => pin.id !== deletedPin.id);
        this.applyFilters();
        this.emit('pinsUpdated', this.filteredPins);
    }

    /**
     * Get pin statistics
     */
    async getStats() {
        try {
            return await supabaseClient.getPinStats();
        } catch (error) {
            console.error('❌ Failed to get pin statistics:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Event listener management
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Error in event listener:', error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.subscription) {
            supabaseClient.unsubscribe(this.subscription);
            this.subscription = null;
        }
        
        // Clear all listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        console.log('🧹 Pin Manager cleaned up');
    }
}

// Create and export singleton instance
const pinManager = new PinManager();

// Make it available globally
window.pinManager = pinManager;

export default pinManager;
