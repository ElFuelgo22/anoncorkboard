import supabaseClient from './supabase-client.js';
import pinManager from './pin-manager.js';
import uiManager from './ui-manager.js';

class maincorkboard {
    constructor() {
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.initializationPromise = null;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        // Prevent multiple initialization attempts
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    /**
     * Internal initialization method
     */
    async _doInitialize() {
        try {
            console.log('🌅 Starting Sunset Corkboard application...');
            
            // Show loading state
            this.showInitialLoading();
            
            // Initialize UI Manager first (handles DOM setup)
            await this.initializeUIManager();
            
            // Initialize Pin Manager (handles data and business logic)
            await this.initializePinManager();
            
            // Setup application event listeners
            this.setupEventListeners();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Mark as initialized
            this.initialized = true;
            
            console.log('✅ Sunset Corkboard application initialized successfully');
            
            // Show welcome message for new users
            this.showWelcomeMessage();
            
            return true;
        } 
        catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Initialize UI Manager
     */
    async initializeUIManager() {
        try {
            console.log('🎨 Initializing UI...');
            uiManager.initialize();
            console.log('✅ UI Manager ready');
        } 
        catch (error) {
            console.error('❌ UI Manager initialization failed:', error);
            throw new Error(`UI initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize Pin Manager
     */
    async initializePinManager() {
        try {
            console.log('📌 Initializing Pin Manager...');
            await pinManager.initialize();
            console.log('✅ Pin Manager ready');
        } 
        catch (error) {
            console.error('❌ Pin Manager initialization failed:', error);
            throw new Error(`Pin Manager initialization failed: ${error.message}`);
        }
    }

    /**
     * Setup application-wide event listeners
     */
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Listen to pin manager events
        pinManager.on('pinsUpdated', (pins) => {
            try {
                uiManager.renderPins(pins);
            } 
            catch (error) {
                console.error('❌ Error rendering pins:', error);
                uiManager.showToast('Failed to render pins', 'error');
            }
        });

        pinManager.on('pinCreated', (pin) => {
            try {
                console.log('📌 New pin created:', pin.title);
            } 
            catch (error) {
                console.error('❌ Error handling pinCreated:', error);
            }
        });

        pinManager.on('pinUpdated', (pin) => {
            try {
                console.log('✏️ Pin updated:', pin.title);
            } 
            catch (error) {
                console.error('❌ Error handling pinUpdated:', error);
            }
        });

        pinManager.on('pinDeleted', (pinId) => {
            try {
                console.log('🗑️ Pin deleted:', pinId);
            } 
            catch (error) {
                console.error('❌ Error handling pinDeleted:', error);
            }
        });

        pinManager.on('error', (error) => {
            try {
                console.error('📌 Pin Manager error:', error);
                uiManager.showToast(error.message || 'An error occurred', 'error');
            } 
            catch (err) {
                console.error('❌ Error handling pinManager error event:', err);
            }
        });
        
        // Handle page visibility changes (for real-time updates)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.initialized) {
                this.handlePageVisible();
            }
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored');
            uiManager.showToast('Connection restored', 'success');
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            console.log('📡 Connection lost');
            uiManager.showToast('Connection lost. Some features may be unavailable.', 'warning');
        });
        
        // Handle unload (cleanup)
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        console.log('✅ Event listeners configured');
    }

    setupErrorHandling() {
        // rejected handling
        window.addEventListener('unhandledrejection', (event) => {
            try {
                console.error('❌ Unhandled promise rejection:', event.reason);
                uiManager.showToast('An unexpected error occurred', 'error');
            } 
            catch (err) {
                console.error('❌ Error handling unhandledrejection:', err);
            }
            // no default ing allowed
            event.preventDefault();
        });
        
        // global error
        window.addEventListener('error', (event) => {
            console.error('❌ Global error:', event.error);
            
            // no you
            try {
                if (event.error && event.error.message) {
                    console.error('Script error:', event.error.message);
                }
            } 
            catch (err) {
                console.error('❌ Error handling global error event:', err);
            }
        });
        
        console.log('✅ Error handling configured');
    }

    /**
     * initial loading state
     */
    showInitialLoading() {
        uiManager.showLoading();
    }

    /**
     * initialization problems
     */
    handleInitializationError(error) {
        console.error('🚨 Application initialization failed:', error);
        
        // Show error state
        uiManager.showError(error);
        
        // Offer retry if not exceeded max attempts
        try {
            if (this.retryCount < this.maxRetries) {
                setTimeout(() => {
                    this.retryInitialization();
                }, 2000);
            } 
            else {
                console.error('🚨 Max retry attempts exceeded');
                uiManager.showToast('Failed to initialize application. Please refresh the page.', 'error', 10000);
            }
        } 
        catch (err) {
            console.error('❌ Error during retry logic:', err);
        }
    }

    /**
     * Retry application initialization
     */
    async retryInitialization() {
        this.retryCount++;
        console.log(`🔄 Retrying initialization (attempt ${this.retryCount}/${this.maxRetries})...`);
        
        try {
            // Reset state
            this.initialized = false;
            this.initializationPromise = null;
            
            // Retry initialization
            await this.initialize();
            
            // Reset retry count on success
            this.retryCount = 0;
            
            uiManager.showToast('Application initialized successfully!', 'success');
        } 
        catch (error) {
            console.error(`❌ Retry attempt ${this.retryCount} failed:`, error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Handle page becoming visible (for refreshing data)
     */
    async handlePageVisible() {
        try {
            console.log('👁️ Page became visible, refreshing data...');
            
            // Only refresh if we've been away for more than 30 seconds
            const lastUpdate = localStorage.getItem('sunset_corkboard_last_update');
            const now = Date.now();
            
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 30000) {
                await pinManager.loadPins();
                localStorage.setItem('sunset_corkboard_last_update', now.toString());
            }
        } 
        catch (error) {
            console.error('❌ Failed to refresh data on page visible:', error);
        }
    }

    /**
     * Handle connection restored
     */
    async handleConnectionRestored() {
        if (!this.initialized) return;
        
        try {
            console.log('🔄 Refreshing data after connection restored...');
            await pinManager.loadPins();
        } 
        catch (error) {
            console.error('❌ Failed to refresh data after connection restored:', error);
        }
    }

    /**
     * Show welcome message for new users
     */
    showWelcomeMessage() {
        const hasVisited = localStorage.getItem('sunset_corkboard_visited');
        
        if (!hasVisited) {
            try {
                setTimeout(() => {
                    try {
                        uiManager.showToast(
                            'Welcome to our anon corkboard! Happy 2nd Monthsary! 🎉\n\n' +
                            'Have a great time!',
                            6000
                        );
                        localStorage.setItem('sunset_corkboard_visited', 'true');
                    } 
                    catch (err) {
                        console.error('❌ Error showing welcome toast:', err);
                    }
                }, 1000);
            } 
            catch (error) {
                console.error('❌ Error in showWelcomeMessage:', error);
            }
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            retryCount: this.retryCount,
            modules: {
                supabaseClient: !!window.supabaseClient,
                pinManager: !!window.pinManager,
                uiManager: !!window.uiManager
            }
        };
    }

    /**
     * Cleanup resources before page unload
     */
    cleanup() {
        console.log('🧹 Cleaning up application resources...');
        
        try {
            if (window.pinManager) {
                pinManager.destroy();
            }
            
            if (window.uiManager) {
                uiManager.destroy();
            }
            
            console.log('✅ Application cleanup complete');
        } 
        catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    /**
     * Restart the application
     */
    async restart() {
        console.log('🔄 Restarting application...');
        
        this.cleanup();
        
        // Reset state
        this.initialized = false;
        this.retryCount = 0;
        this.initializationPromise = null;
        
        // Reinitialize
        await this.initialize();
        
        console.log('✅ Application restarted successfully');
    }
}

// Create application instance
const app = new maincorkboard();

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.initialize().catch(error => {
            console.error('❌ Failed to start application:', error);
        });
    });
} 
else {
    app.initialize().catch(error => {
        console.error('❌ Failed to start application:', error);
    });
}

// Make app instance available globally for debugging
window.sunsetCorkboard = app;

// Export for potential module usage
export default app;
