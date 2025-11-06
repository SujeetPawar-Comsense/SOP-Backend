/**
 * Database Migration Script
 * Applies the Supabase migration to your database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`📏 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    console.log('⚠️  Note: Complex migrations should be run directly in Supabase SQL Editor');
    console.log('This script is for reference. Please use Supabase Dashboard:\n');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Open SQL Editor');
    console.log('3. Copy and paste supabase_migration.sql');
    console.log('4. Click RUN\n');

    console.log('✅ Migration file is ready to use!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

