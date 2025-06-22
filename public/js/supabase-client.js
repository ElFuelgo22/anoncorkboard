/**
 * Supabase Client Module
 * Handles connection to Supabase and provides database operations
 */

class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.config = null;
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize Supabase client with configuration from server
     */
    async initialize() {
        try {
            // Get configuration from server
            const configResponse = await fetch('/api/config');
            if (!configResponse.ok) {
                throw new Error('Failed to fetch configuration');
            }
            
            this.config = await configResponse.json();
            
            // Validate required configuration
            if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
                throw new Error('Missing Supabase configuration. Please check your .env file.');
            }

            // Initialize Supabase client
            const { createClient } = supabase;
            this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);
            
            // Test connection
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ Supabase client initialized successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            throw error;
        }
    }

    /**
     * Test the Supabase connection
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('pins')
                .select('count')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                // Table doesn't exist, which is expected on first run
                console.log('ℹ️ Pins table not found - needs to be created');
                return true;
            } else if (error) {
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Supabase connection test failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    /**
     * Ensure client is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Supabase client not initialized. Call initialize() first.');
        }
    }

    /**
     * Create the pins table if it doesn't exist
     */
    async createPinsTable() {
        this.ensureInitialized();
        
        try {
            const { error } = await this.supabase.rpc('create_pins_table_if_not_exists');
            
            if (error) {
                // If RPC doesn't exist, try direct table creation
                console.log('Creating pins table...');
                // Note: This will need to be done through Supabase SQL editor
                // as we can't create tables directly from the client
                throw new Error('Please create the pins table using the SQL provided in db/schema.js');
            }
            
            console.log('✅ Pins table ready');
            return true;
        } catch (error) {
            console.error('❌ Failed to create pins table:', error);
            throw error;
        }
    }

    /**
     * Get all pins
     */
    async getPins() {
        this.ensureInitialized();
        
        try {
            const { data, error } = await this.supabase
                .from('pins')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Failed to fetch pins:', error);
            throw new Error(`Failed to load pins: ${error.message}`);
        }
    }

    /**
     * Create a new pin
     */
async createPin(pinData) {
    this.ensureInitialized();
    
    try {
        const pin = {
            title: pinData.title.trim(),
            content: pinData.content.trim(),
            nickname: pinData.nickname ? pinData.nickname.trim() : 'Anonymous',
            rp_name: pinData.rp_name.trim(),
            main_number: String(pinData.main_number), // Ensure main_number is a string
            author_id: this.generateAuthorId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await this.supabase
            .from('pins')
            .insert([pin])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        console.log('✅ Pin created successfully:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Failed to create pin:', error);
        throw new Error(`Failed to create pin: ${error.message}`);
    }
}

    /**
     * Update a pin
     */
    async updatePin(pinId, updates, authorId) {
        this.ensureInitialized();
        
        try {
            // Check if user owns this pin
            const { data: existingPin, error: fetchError } = await this.supabase
                .from('pins')
                .select('author_id')
                .eq('id', pinId)
                .single();
            
            if (fetchError) {
                throw fetchError;
            }
            
            if (existingPin.author_id !== authorId) {
                throw new Error('You can only edit your own pins');
            }
            
            const updateData = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('pins')
                .update(updateData)
                .eq('id', pinId)
                .eq('author_id', authorId)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Pin updated successfully:', pinId);
            return data;
        } catch (error) {
            console.error('❌ Failed to update pin:', error);
            throw new Error(`Failed to update pin: ${error.message}`);
        }
    }

    /**
     * Delete a pin
     */
    async deletePin(pinId, authorId = null) {
        this.ensureInitialized();
        
        try {
            let query = this.supabase
                .from('pins')
                .delete()
                .eq('id', pinId);
            
            // If authorId is provided, check ownership
            if (authorId) {
                query = query.eq('author_id', authorId);
            }
            
            const { error } = await query;
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Pin deleted successfully:', pinId);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete pin:', error);
            throw new Error(`Failed to delete pin: ${error.message}`);
        }
    }

    /**
     * Delete multiple pins (admin only)
     */
    async deletePins(pinIds) {
        this.ensureInitialized();
        
        try {
            // Admin can delete any pins by bypassing RLS temporarily
            const { error } = await this.supabase.rpc('admin_delete_pins', {
                pin_ids: pinIds
            });
            
            if (error) {
                // Fallback to individual deletions if RPC doesn't exist
                console.log('Fallback: deleting pins individually');
                for (const pinId of pinIds) {
                    await this.deletePin(pinId);
                }
            }
            
            console.log('✅ Pins deleted successfully:', pinIds.length);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete pins:', error);
            throw new Error(`Failed to delete pins: ${error.message}`);
        }
    }

    /**
     * Delete all pins (admin only)
     */
    async deleteAllPins() {
        this.ensureInitialized();
        
        try {
            // Use RPC function for admin delete all
            const { error } = await this.supabase.rpc('admin_delete_all_pins');
            
            if (error) {
                // Fallback: get all pins and delete individually
                console.log('Fallback: deleting all pins individually');
                const { data: allPins } = await this.supabase
                    .from('pins')
                    .select('id');
                
                if (allPins && allPins.length > 0) {
                    const pinIds = allPins.map(pin => pin.id);
                    for (const pinId of pinIds) {
                        await this.deletePin(pinId);
                    }
                }
            }
            
            console.log('✅ All pins deleted successfully');
            return true;
        } 
        catch (error) {
            console.error('❌ Failed to delete all pins:', error);
            throw new Error(`Failed to delete all pins: ${error.message}`);
        }
    }

    /**
     * Get pin statistics
     */
    async getPinStats() {
        this.ensureInitialized();
        
        try {
            // Get total pins
            const { count: totalPins, error: totalError } = await this.supabase
                .from('pins')
                .select('*', { count: 'exact', head: true });
            
            if (totalError) {
                throw totalError;
            }
            
            // Get today's pins
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: todayPins, error: todayError } = await this.supabase
                .from('pins')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            if (todayError) {
                throw todayError;
            }
            
            // Get unique authors
            const { data: authorsData, error: authorsError } = await this.supabase
                .from('pins')
                .select('author')
                .not('author', 'is', null);
            
            if (authorsError) {
                throw authorsError;
            }
            
            const uniqueAuthors = new Set(authorsData.map(pin => pin.author)).size;
            
            return {
                totalPins: totalPins || 0,
                todayPins: todayPins || 0,
                uniqueAuthors
            };
        } catch (error) {
            console.error('❌ Failed to get pin statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Subscribe to real-time pin changes
     */
    subscribeToPins(callback) {
        this.ensureInitialized();
        
        try {
            const subscription = this.supabase
                .channel('pins-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'pins' },
                    (payload) => {
                        console.log('📡 Real-time update:', payload);
                        callback(payload);
                    }
                )
                .subscribe();
            
            console.log('📡 Subscribed to real-time pin updates');
            return subscription;
        } catch (error) {
            console.error('❌ Failed to subscribe to pin updates:', error);
            return null;
        }
    }

    /**
     * Unsubscribe from real-time updates
     */
    unsubscribe(subscription) {
        if (subscription) {
            this.supabase.removeChannel(subscription);
            console.log('📡 Unsubscribed from real-time updates');
        }
    }

    /**
     * Generate a unique author ID for anonymous ownership
     */
    generateAuthorId() {
        // Get or create author ID from localStorage
        let authorId = localStorage.getItem('sunset_corkboard_author_id');
        
        if (!authorId) {
            authorId = 'author_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sunset_corkboard_author_id', authorId);
        }
        
        return authorId;
    }

    /**
     * Get current user's author ID
     */
    getCurrentAuthorId() {
        return localStorage.getItem('sunset_corkboard_author_id') || this.generateAuthorId();
    }

    /**
     * Validate admin credentials
     */
    validateAdminCredentials(username, password) {
        return username === this.config.adminUsername && password === this.config.adminPassword;
    }

    /**
     * Check if current session is admin
     */
    isAdmin() {
        return localStorage.getItem('sunset_corkboard_admin') === 'true';
    }

    /**
     * Set admin session
     */
    setAdminSession(isAdmin) {
        if (isAdmin) {
            localStorage.setItem('sunset_corkboard_admin', 'true');
        } else {
            localStorage.removeItem('sunset_corkboard_admin');
        }
    }

    /**
     * Retry wrapper for failed operations
     */
    async withRetry(operation, maxRetries = this.maxRetries) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (i < maxRetries) {
                    console.log(`⚠️ Operation failed, retrying... (${i + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        
        throw lastError;
    }
}

// Create and export singleton instance
const supabaseClient = new SupabaseClient();

// Make it available globally
window.supabaseClient = supabaseClient;

export default supabaseClient;
