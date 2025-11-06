/**
 * Database Seeding Script
 * Creates sample data for testing
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

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Create test users
    console.log('👤 Creating test users...');

    // Project Owner
    const { data: ownerAuth, error: ownerError } = await supabase.auth.admin.createUser({
      email: 'owner@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        name: 'John Owner',
        role: 'project_owner'
      }
    });

    if (ownerError) {
      console.error('Error creating owner:', ownerError.message);
    } else {
      await supabase.from('users').insert({
        id: ownerAuth.user.id,
        email: 'owner@example.com',
        name: 'John Owner',
        role: 'project_owner'
      });
      console.log('  ✅ Project Owner: owner@example.com / password123');
    }

    // Vibe Engineer
    const { data: engineerAuth, error: engineerError } = await supabase.auth.admin.createUser({
      email: 'engineer@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        name: 'Jane Engineer',
        role: 'vibe_engineer'
      }
    });

    if (engineerError) {
      console.error('Error creating engineer:', engineerError.message);
    } else {
      await supabase.from('users').insert({
        id: engineerAuth.user.id,
        email: 'engineer@example.com',
        name: 'Jane Engineer',
        role: 'vibe_engineer'
      });
      console.log('  ✅ Vibe Engineer: engineer@example.com / password123');
    }

    // Create sample projects
    if (ownerAuth?.user) {
      console.log('\n📁 Creating sample projects...');

      const { data: project1 } = await supabase.from('projects').insert({
        name: 'E-commerce Platform',
        description: 'A modern e-commerce platform with user management and product catalog',
        created_by: ownerAuth.user.id,
        created_by_name: 'John Owner',
        created_by_role: 'project_owner',
        completion_percentage: 25
      }).select().single();

      if (project1) {
        console.log('  ✅ E-commerce Platform created');

        // Add sample module
        await supabase.from('modules').insert({
          project_id: project1.id,
          module_name: 'User Authentication',
          description: 'Handles user login, signup, and session management',
          priority: 'High',
          business_impact: 'Critical for platform security',
          dependencies: 'Database, Email Service',
          status: 'In Progress'
        });

        // Add sample user story
        await supabase.from('user_stories').insert({
          project_id: project1.id,
          title: 'User Login',
          user_role: 'Customer',
          description: 'As a customer, I want to login to my account so that I can access my orders',
          acceptance_criteria: 'Given valid credentials, when user logs in, then they should be redirected to dashboard',
          priority: 'High',
          status: 'Not Started'
        });

        console.log('  ✅ Sample data added to project');
      }

      const { data: project2 } = await supabase.from('projects').insert({
        name: 'Mobile Banking App',
        description: 'Secure mobile banking application with real-time transactions',
        created_by: ownerAuth.user.id,
        created_by_name: 'John Owner',
        created_by_role: 'project_owner',
        completion_percentage: 0
      }).select().single();

      if (project2) {
        console.log('  ✅ Mobile Banking App created');
      }
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Test Accounts:');
    console.log('   Project Owner: owner@example.com / password123');
    console.log('   Vibe Engineer: engineer@example.com / password123\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase().then(() => process.exit(0));

