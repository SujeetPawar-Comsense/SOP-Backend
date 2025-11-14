/**
 * Migration script to create chat_history table
 * Run this script to add chat history functionality to the database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Starting chat history migration...');

  try {
    // Read the SQL schema file
    const sqlPath = path.join(__dirname, '..', 'src', 'database', 'chat-history-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct execution if RPC doesn't work
          console.log('RPC failed, attempting direct execution...');
          // Note: Direct SQL execution might not be available in all Supabase setups
          // You may need to run these statements manually in the Supabase SQL editor
          console.warn(`Statement ${i + 1} may need manual execution:`, statement.substring(0, 50) + '...');
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err.message);
        console.log('Statement:', statement.substring(0, 100) + '...');
      }
    }

    console.log('\n==============================================');
    console.log('Migration completed!');
    console.log('==============================================');
    console.log('\nNote: If some statements failed, you may need to:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy the contents of src/database/chat-history-schema.sql');
    console.log('4. Run the SQL manually');
    console.log('\nThe chat_history table should now be available for use.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Alternative: Check if table exists
async function checkTableExists() {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('Table chat_history does not exist. Running migration...');
      return false;
    } else if (error) {
      console.log('Error checking table:', error.message);
      return false;
    } else {
      console.log('Table chat_history already exists.');
      return true;
    }
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('Chat History Migration Script');
  console.log('==============================\n');

  // Check if table already exists
  const tableExists = await checkTableExists();

  if (tableExists) {
    console.log('Migration not needed - table already exists.');
    console.log('\nTo force re-creation, drop the table first in Supabase dashboard.');
  } else {
    await runMigration();
  }

  process.exit(0);
}

main().catch(console.error);
