-- Apply invitation system migration to existing database
-- Run this in Supabase Dashboard > SQL Editor

-- Drop and recreate invitations table to fix encoding issue
DROP TABLE IF EXISTS invitations CASCADE;

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for token lookups (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_token_idx') THEN
        CREATE UNIQUE INDEX invitations_token_idx ON invitations(token);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_email_idx') THEN
        CREATE INDEX invitations_email_idx ON invitations(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_expires_at_idx') THEN
        CREATE INDEX invitations_expires_at_idx ON invitations(expires_at);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all invitations" ON invitations;
DROP POLICY IF EXISTS "Course leaders can view their invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create any invitations" ON invitations;
DROP POLICY IF EXISTS "Course leaders can create student invitations" ON invitations;
DROP POLICY IF EXISTS "Inviters can update their invitations" ON invitations;
DROP POLICY IF EXISTS "Public can verify invitation tokens" ON invitations;

-- Create RLS policies for invitations
-- Admins can see all invitations
CREATE POLICY "Admins can view all invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Course leaders can view invitations they created or for students
CREATE POLICY "Course leaders can view their invitations" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (
        profiles.role = 'admin' OR
        (profiles.role = 'course_leader' AND (invitations.invited_by = auth.uid() OR invitations.role = 'student'))
      )
    )
  );

-- Admins can create any invitations
CREATE POLICY "Admins can create any invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Course leaders can only create student invitations
CREATE POLICY "Course leaders can create student invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'course_leader'
    ) AND role = 'student'
  );

-- Only the inviter can update their invitations (for admin/course_leader)
CREATE POLICY "Inviters can update their invitations" ON invitations
  FOR UPDATE USING (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Public read access for invitation verification (by token)
CREATE POLICY "Public can verify invitation tokens" ON invitations
  FOR SELECT USING (true);

-- Create or replace function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM invitations 
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating invitation timestamps
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invitations_updated_at') THEN
        CREATE TRIGGER update_invitations_updated_at 
          BEFORE UPDATE ON invitations 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verification query - run this to check if the migration worked
SELECT 
    'Invitations table created' as status,
    count(*) as row_count 
FROM invitations;