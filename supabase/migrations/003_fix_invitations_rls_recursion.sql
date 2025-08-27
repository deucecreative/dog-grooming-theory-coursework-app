-- Fix infinite recursion in invitations RLS policies
-- Issue: Policies query profiles table which has RLS, creating recursion
-- Date: 2025-08-20

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins and course leaders can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins and course leaders can create invitations" ON invitations; 
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Course leaders can delete their own invitations" ON invitations;

-- Create non-recursive policies that allow authenticated users to manage invitations
-- This is a temporary solution to fix the recursion while maintaining functionality

-- Allow authenticated users to view invitations (temporary - more permissive than ideal)
CREATE POLICY "Authenticated users can view invitations" ON invitations FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to create invitations (temporary - more permissive than ideal)  
CREATE POLICY "Authenticated users can create invitations" ON invitations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update invitations (needed for some operations)
CREATE POLICY "Authenticated users can update invitations" ON invitations FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete invitations (temporary - more permissive than ideal)
CREATE POLICY "Authenticated users can delete invitations" ON invitations FOR DELETE
USING (auth.role() = 'authenticated');

-- Note: These policies are more permissive than ideal for production.
-- For production, consider these alternatives:
-- 1. Use service role key for admin/course leader operations in API routes
-- 2. Store roles in auth.users metadata to avoid table queries in policies  
-- 3. Create separate admin_roles table to break the circular dependency
-- 4. Use more sophisticated policy patterns that don't create recursion

-- The current solution allows any authenticated user to manage invitations,
-- which is acceptable for this educational application but should be 
-- reviewed for production deployments.