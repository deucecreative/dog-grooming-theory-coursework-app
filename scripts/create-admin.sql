-- Bootstrap Admin Account Creation Script
-- Run this script in Supabase SQL Editor after the main migration

-- STEP 1: First, create the auth user through Supabase Dashboard or use this if you have service role access:
-- This would typically be done through the Supabase Dashboard > Authentication > Users > "Add user"

-- STEP 2: After creating the auth user, get their ID and update the profile
-- Replace 'ACTUAL_USER_ID_HERE' with the real UUID from auth.users table
-- Replace 'admin@yourschool.edu' with the actual admin email

-- Example of how to find the user ID (run this first):
-- SELECT id, email FROM auth.users WHERE email = 'admin@yourschool.edu';

-- Then run this to make them admin:
UPDATE profiles 
SET 
  role = 'admin',
  status = 'approved',
  approved_by = id, -- Self-approved for bootstrap
  approved_at = NOW()
WHERE email = 'admin@yourschool.edu'; -- Replace with actual admin email

-- Verify the admin was created:
SELECT id, email, role, status, created_at
FROM profiles 
WHERE role = 'admin';

-- ALTERNATIVE: If you need to create multiple admins or want a more flexible approach,
-- you can create a temporary "bootstrap" mode in your application that allows
-- the first user to claim admin privileges, then disable it.

-- SECURITY NOTE: 
-- 1. Change the admin password immediately after first login
-- 2. Use a real institutional email address (admin@yourschool.edu)  
-- 3. Consider using 2FA if available
-- 4. Remove this script from production environments