-- Fix RLS DELETE policy for invitations table
-- Addresses security vulnerability where DELETE operations are allowed without authentication
-- Date: 2025-08-22

-- First, let's check if RLS is enabled and enable it if not
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate ALL policies to ensure they are properly configured
-- This addresses potential issues with policy precedence or misconfiguration

DROP POLICY IF EXISTS "Authenticated users can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can create invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can update invitations" ON invitations;

-- Recreate all policies with explicit and strict authentication requirements
CREATE POLICY "Authenticated users can view invitations" ON invitations FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create invitations" ON invitations FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invitations" ON invitations FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- This is the critical policy that should prevent unauthenticated DELETEs
CREATE POLICY "Authenticated users can delete invitations" ON invitations FOR DELETE
USING (auth.role() = 'authenticated');

-- Ensure proper permissions
GRANT ALL ON invitations TO authenticated;

-- Remove any potential conflicting permissions for anonymous users
REVOKE ALL ON invitations FROM anon;