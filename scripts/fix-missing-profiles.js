/**
 * Fix Missing User Profiles
 * 
 * This script finds users in auth.users who don't have a profile
 * in public.users table and creates the missing profiles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMissingProfiles() {
  try {
    console.log('🔍 Checking for users without profiles...\n');

    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    console.log(`📊 Found ${authUsers.length} users in auth.users`);

    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select('id');

    if (profileError) {
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    const profileIds = new Set(profiles?.map(p => p.id) || []);
    console.log(`📊 Found ${profileIds.size} profiles in public.users\n`);

    // Find users without profiles
    const usersWithoutProfiles = authUsers.filter(user => !profileIds.has(user.id));

    if (usersWithoutProfiles.length === 0) {
      console.log('✅ All users have profiles! No fixes needed.\n');
      return;
    }

    console.log(`⚠️  Found ${usersWithoutProfiles.length} users without profiles:\n`);

    // Create missing profiles
    for (const user of usersWithoutProfiles) {
      console.log(`   Creating profile for: ${user.email}`);
      
      const name = user.user_metadata?.name || user.email.split('@')[0];
      const role = user.user_metadata?.role || 'vibe_engineer';

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: name,
          role: role
        });

      if (insertError) {
        console.error(`   ❌ Failed to create profile for ${user.email}:`, insertError.message);
      } else {
        console.log(`   ✅ Profile created for ${user.email} (role: ${role})`);
      }
    }

    console.log('\n🎉 Profile fix complete!');
    console.log('\n📊 Summary:');
    console.log(`   Total auth users: ${authUsers.length}`);
    console.log(`   Profiles created: ${usersWithoutProfiles.length}`);
    console.log(`   Total profiles: ${profileIds.size + usersWithoutProfiles.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

fixMissingProfiles().then(() => process.exit(0));

