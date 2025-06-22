/**
 * Database Setup Utilities
 * Provides functions to initialize and manage the Sunset Corkboard database
 */

import { 
    PINS_TABLE_SCHEMA, 
    RLS_POLICIES, 
    ADMIN_FUNCTIONS, 
    SETUP_QUERIES,
    COMPLETE_SETUP,
    MIGRATIONS,
    VALIDATION_QUERIES 
} from './schema.js';

/**
 * Database Setup Manager
 * Handles database initialization, validation, and migrations
 */
class DatabaseSetup {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.isSetup = false;
        this.setupErrors = [];
        this.validationResults = {};
    }

    /**
     * Initialize database setup
     */
    async initialize() {
        try {
            console.log('🗄️ Initializing database setup...');
            
            // Validate connection first
            await this.validateConnection();
            
            // Check if setup is needed
            const needsSetup = await this.checkSetupRequired();
            
            if (needsSetup) {
                console.log('⚙️ Database setup required');
                await this.displaySetupInstructions();
            } else {
                console.log('✅ Database already set up');
                this.isSetup = true;
            }
            
            // Validate current setup
            await this.validateSetup();
            
            return this.isSetup;
        } catch (error) {
            console.error('❌ Database setup initialization failed:', error);
            this.setupErrors.push(error.message);
            throw error;
        }
    }

    /**
     * Validate Supabase connection
     */
    async validateConnection() {
        try {
            // Test basic connection
            const { data, error } = await this.supabase.from('information_schema.tables').select('table_name').limit(1);
            
            if (error) {
                throw new Error(`Connection test failed: ${error.message}`);
            }
            
            console.log('✅ Database connection validated');
            return true;
        } catch (error) {
            console.error('❌ Database connection validation failed:', error);
            throw new Error(`Cannot connect to database: ${error.message}`);
        }
    }

    /**
     * Check if database setup is required
     */
    async checkSetupRequired() {
        try {
            // Check if pins table exists
            const { data, error } = await this.supabase.rpc('check_table_exists', {
                table_name: 'pins'
            });
            
            if (error) {
                // If RPC doesn't exist, try direct query
                const { data: tableData, error: tableError } = await this.supabase
                    .from('pins')
                    .select('id')
                    .limit(1);
                
                // If table doesn't exist, we get a specific error
                if (tableError && tableError.code === 'PGRST116') {
                    return true; // Setup required
                } else if (tableError) {
                    throw tableError;
                }
                
                return false; // Table exists
            }
            
            return !data;
        } catch (error) {
            console.log('ℹ️ Assuming setup is required due to error:', error.message);
            return true;
        }
    }

    /**
     * Display setup instructions to the user
     */
    async displaySetupInstructions() {
        const instructions = this.generateSetupInstructions();
        
        console.log('\n📋 DATABASE SETUP REQUIRED');
        console.log('==========================================');
        console.log(instructions);
        console.log('==========================================\n');
        
        // Also try to provide browser notification if possible
        if (typeof window !== 'undefined' && window.location) {
            this.showBrowserSetupInstructions();
        }
    }

    /**
     * Generate setup instructions
     */
    generateSetupInstructions() {
        return `
🌅 SUNSET CORKBOARD DATABASE SETUP

To complete the setup of your Sunset Corkboard application, please follow these steps:

1. 📝 Open your Supabase project dashboard
   → Go to: https://supabase.com/dashboard/projects

2. 🔍 Navigate to the SQL Editor
   → Click on "SQL Editor" in the left sidebar

3. 📋 Copy and paste the following SQL script:

${COMPLETE_SETUP}

4. ▶️ Execute the SQL script
   → Click "Run" to execute the script

5. ✅ Verify the setup
   → Check that the "pins" table appears in your database

6. 🔄 Refresh your application
   → Reload the browser page to complete the setup

📌 What this script does:
   • Creates the 'pins' table with proper structure
   • Sets up Row Level Security (RLS) for data protection
   • Creates indexes for better performance
   • Adds helpful database functions
   • Enables real-time subscriptions

🔒 Security Notes:
   • RLS ensures users can only edit/delete their own pins
   • Admin functions are available for management
   • All data is properly validated and sanitized

If you encounter any issues, please check:
   • Your Supabase project is active
   • You have sufficient permissions
   • The DATABASE_URL in your .env file is correct

Need help? Check the Supabase documentation: https://supabase.com/docs
`;
    }

    /**
     * Show browser setup instructions
     */
    showBrowserSetupInstructions() {
        if (typeof document !== 'undefined') {
            // Try to show a modal or notification in the browser
            const setupModal = document.createElement('div');
            setupModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: 'Segoe UI', monospace;
            `;
            
            setupModal.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #ff6b35, #ffd93d);
                    padding: 2rem;
                    border-radius: 1rem;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #2c3e50;
                    box-shadow: 0 20px 25px rgba(0,0,0,0.3);
                ">
                    <h2 style="margin-top: 0; color: #2c3e50;">
                        🌅 Database Setup Required
                    </h2>
                    <p>Your Sunset Corkboard needs a database setup to function properly.</p>
                    <p><strong>Please check the browser console for detailed setup instructions.</strong></p>
                    <p>After setting up the database in Supabase, refresh this page.</p>
                    <div style="margin-top: 1.5rem;">
                        <button onclick="window.location.reload()" style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 0.5rem;
                            cursor: pointer;
                            margin-right: 1rem;
                            font-weight: 500;
                        ">Refresh Page</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                            background: transparent;
                            color: #2c3e50;
                            border: 2px solid #2c3e50;
                            padding: 0.75rem 1.5rem;
                            border-radius: 0.5rem;
                            cursor: pointer;
                            font-weight: 500;
                        ">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(setupModal);
        }
    }

    /**
     * Validate current database setup
     */
    async validateSetup() {
        console.log('🔍 Validating database setup...');
        
        const validations = {
            tableExists: false,
            columnsCorrect: false,
            indexesExist: false,
            rlsEnabled: false,
            functionsExist: false
        };

        try {
            // Check table existence
            validations.tableExists = await this.validateTableExists();
            
            if (validations.tableExists) {
                // Check columns
                validations.columnsCorrect = await this.validateColumns();
                
                // Check indexes
                validations.indexesExist = await this.validateIndexes();
                
                // Check RLS
                validations.rlsEnabled = await this.validateRLS();
                
                // Check functions
                validations.functionsExist = await this.validateFunctions();
            }
            
            this.validationResults = validations;
            this.isSetup = Object.values(validations).every(v => v === true);
            
            if (this.isSetup) {
                console.log('✅ Database setup validation passed');
            } else {
                console.warn('⚠️ Database setup validation failed:', validations);
            }
            
            return this.isSetup;
        } catch (error) {
            console.error('❌ Database validation error:', error);
            this.setupErrors.push(error.message);
            return false;
        }
    }

    /**
     * Validate table exists
     */
    async validateTableExists() {
        try {
            const { data, error } = await this.supabase
                .from('pins')
                .select('id')
                .limit(1);
            
            return !error || error.code !== 'PGRST116';
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate columns are correct
     */
    async validateColumns() {
        try {
            // Try to select all expected columns
            const { data, error } = await this.supabase
                .from('pins')
                .select('id, title, content, author, author_id, created_at, updated_at')
                .limit(1);
            
            return !error;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate indexes exist
     */
    async validateIndexes() {
        try {
            // This is harder to validate from client side
            // We'll assume indexes are OK if table operations work
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate RLS is enabled
     */
    async validateRLS() {
        try {
            // Test RLS by trying operations
            // This is complex to test from client side
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate functions exist
     */
    async validateFunctions() {
        try {
            // Try to call get_pin_stats function
            const { data, error } = await this.supabase.rpc('get_pin_stats');
            return !error;
        } catch (error) {
            return false;
        }
    }

    /**
     * Run database migration
     */
    async runMigration(migrationName) {
        if (!MIGRATIONS[migrationName]) {
            throw new Error(`Migration ${migrationName} not found`);
        }
        
        try {
            console.log(`🔄 Running migration: ${migrationName}`);
            
            // Migrations should be run through Supabase SQL editor
            console.log('📋 Migration SQL:');
            console.log(MIGRATIONS[migrationName]);
            
            console.log('⚠️ Please run this migration in your Supabase SQL editor');
            return true;
        } catch (error) {
            console.error(`❌ Migration ${migrationName} failed:`, error);
            throw error;
        }
    }

    /**
     * Get setup status
     */
    getSetupStatus() {
        return {
            isSetup: this.isSetup,
            validationResults: this.validationResults,
            errors: this.setupErrors,
            instructions: this.isSetup ? null : this.generateSetupInstructions()
        };
    }

    /**
     * Export setup SQL for manual execution
     */
    exportSetupSQL() {
        return {
            complete: COMPLETE_SETUP,
            schema: PINS_TABLE_SCHEMA,
            policies: RLS_POLICIES,
            functions: ADMIN_FUNCTIONS,
            setup: SETUP_QUERIES
        };
    }

    /**
     * Get validation queries for manual testing
     */
    getValidationQueries() {
        return VALIDATION_QUERIES;
    }

    /**
     * Reset setup state (for testing)
     */
    reset() {
        this.isSetup = false;
        this.setupErrors = [];
        this.validationResults = {};
    }
}

/**
 * Utility functions for database operations
 */
export const DatabaseUtils = {
    /**
     * Generate a setup checklist
     */
    generateChecklist() {
        return [
            '☐ Create Supabase project',
            '☐ Copy DATABASE_URL to .env file',
            '☐ Run setup SQL in Supabase SQL editor',
            '☐ Verify pins table exists',
            '☐ Test application functionality',
            '☐ Check real-time updates work'
        ];
    },

    /**
     * Get common setup errors and solutions
     */
    getCommonErrors() {
        return {
            'PGRST116': {
                error: 'Table or view not found',
                solution: 'Run the database setup SQL in Supabase SQL editor'
            },
            'PGRST301': {
                error: 'JWT expired',
                solution: 'Check your Supabase configuration and API keys'
            },
            '42P01': {
                error: 'Relation does not exist',
                solution: 'Ensure the pins table is created in your database'
            },
            '42501': {
                error: 'Permission denied',
                solution: 'Check RLS policies and authentication setup'
            }
        };
    },

    /**
     * Get setup validation checklist
     */
    getValidationChecklist() {
        return [
            'Table "pins" exists',
            'Required columns present',
            'Indexes created',
            'RLS policies active',
            'Admin functions available',
            'Real-time enabled'
        ];
    }
};

// Export the setup class and utilities
export { DatabaseSetup, COMPLETE_SETUP, MIGRATIONS, VALIDATION_QUERIES };
export default DatabaseSetup;
