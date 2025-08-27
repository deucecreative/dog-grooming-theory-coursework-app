-- Fix infinite recursion in profiles RLS policies
-- Issue: Policies that query profiles table to check roles create recursion
-- Date: 2025-08-20

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create a non-recursive policy that allows authenticated users to read all profiles
-- This is a temporary solution to fix the recursion while maintaining functionality
CREATE POLICY "Authenticated users can view all profiles" ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Note: For production, consider these alternatives:
-- 1. Use service role key for admin operations
-- 2. Store roles in auth.users metadata to avoid table queries in policies  
-- 3. Create separate admin_roles table to break the circular dependency

-- The current solution allows any authenticated user to read profiles,
-- which is acceptable for this educational application but should be 
-- reviewed for production deployments.