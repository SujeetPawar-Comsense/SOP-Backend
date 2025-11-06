-- ============================================
-- COMPLETE FIX FOR ALL PERMISSION ISSUES
-- ============================================
-- Run this ENTIRE file in Supabase SQL Editor
-- This fixes:
-- 1. Permission denied errors
-- 2. Duplicate key errors
-- 3. Missing profile issues
-- ============================================

-- ============================================
-- STEP 1: Remove conflicting trigger (if exists)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- STEP 2: Grant all necessary permissions
-- ============================================

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO postgres;

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on future tables (important!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;

-- Explicitly grant INSERT on users table (critical!)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.users TO authenticated;

-- ============================================
-- STEP 3: Clean up orphaned auth users (optional)
-- ============================================

-- Find auth users without profiles
-- Uncomment the next line if you want to see them first:
-- SELECT au.id, au.email FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL;

-- Delete orphaned auth users (users without profiles)
-- Uncomment if you want to clean up:
-- DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.users);

-- ============================================
-- STEP 4: Verify permissions
-- ============================================

-- Check service_role permissions on users table
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND grantee IN ('service_role', 'authenticated', 'postgres')
ORDER BY grantee, privilege_type;

-- Should show multiple rows with INSERT, SELECT, UPDATE, DELETE for service_role

-- ============================================
-- STEP 5: Check for triggers
-- ============================================

-- Verify trigger was removed
SELECT trigger_name, event_object_table
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- Should return 0 rows (trigger removed)

-- ============================================
-- SUCCESS!
-- ============================================

-- If you see the permissions above, you're all set!
-- Now restart your backend and try signup again.
-- 
-- The updated auth.routes.ts code will:
-- 1. Create auth user
-- 2. Check if profile exists
-- 3. Create profile if doesn't exist
-- 4. Handle duplicates gracefully
-- 
-- No more errors! ✅

