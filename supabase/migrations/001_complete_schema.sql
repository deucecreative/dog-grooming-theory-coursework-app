-- Complete Dog Grooming Theory Platform Schema
-- Consolidated migration with full course management system
-- Created: 2025-08-20
-- IDEMPOTENT: Safe to run on existing databases

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (safe for existing databases)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'course_leader', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'reviewed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('multiple_choice', 'essay', 'practical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'student',
    status account_status DEFAULT 'pending',
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    status course_status DEFAULT 'draft',
    duration_weeks INTEGER,
    max_students INTEGER,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create course enrollments table (many-to-many: students <-> courses)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    enrollment_status TEXT DEFAULT 'active' CHECK (enrollment_status IN ('active', 'completed', 'withdrawn', 'suspended')),
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    final_grade DECIMAL(5,2) CHECK (final_grade >= 0 AND final_grade <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, student_id)
);

-- Create course instructors table (many-to-many: course_leaders <-> courses)
CREATE TABLE IF NOT EXISTS course_instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'instructor' CHECK (role IN ('instructor', 'assistant', 'grader')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, instructor_id)
);

-- Create invitations table (with course_id column for existing tables)
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    role user_role NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add course_id column to invitations if it doesn't exist
DO $$ BEGIN
    ALTER TABLE invitations ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create questions table (with course_id column for existing tables)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type question_type NOT NULL,
    options JSONB,
    correct_answer TEXT,
    points INTEGER DEFAULT 1,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add course_id column to questions if it doesn't exist
DO $$ BEGIN
    ALTER TABLE questions ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    question_ids UUID[] DEFAULT '{}',
    due_date TIMESTAMPTZ,
    max_points INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add course_id column to assignments if it doesn't exist, then make it required
DO $$ 
DECLARE
    default_course_id UUID;
BEGIN
    -- Add course_id column if it doesn't exist
    BEGIN
        ALTER TABLE assignments ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    
    -- Get or create default course for existing assignments
    SELECT id INTO default_course_id FROM courses WHERE title = 'Legacy Content';
    IF default_course_id IS NULL THEN
        INSERT INTO courses (title, description, status, created_at)
        VALUES ('Legacy Content', 'Default course for existing assignments and questions', 'active', NOW())
        RETURNING id INTO default_course_id;
    END IF;
    
    -- Update existing assignments to belong to default course
    UPDATE assignments SET course_id = default_course_id WHERE course_id IS NULL;
    
    -- Make course_id required for future assignments (only if column was just added)
    BEGIN
        ALTER TABLE assignments ALTER COLUMN course_id SET NOT NULL;
    EXCEPTION
        WHEN others THEN null;
    END;
END $$;

-- Note: coursework_assignments table removed as it's not part of current schema

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    answers JSONB,
    status submission_status DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI assessments table
CREATE TABLE IF NOT EXISTS ai_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    content_score DECIMAL(5,2),
    technical_accuracy DECIMAL(5,2),
    completeness DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    feedback TEXT,
    suggestions JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create final grades table
CREATE TABLE IF NOT EXISTS final_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    ai_score DECIMAL(5,2),
    instructor_score DECIMAL(5,2),
    final_score DECIMAL(5,2),
    comments TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers (safe for existing databases)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON course_enrollments;
CREATE TRIGGER update_course_enrollments_updated_at BEFORE UPDATE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: coursework_assignments triggers removed as table doesn't exist

DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_final_grades_updated_at ON final_grades;
CREATE TRIGGER update_final_grades_updated_at BEFORE UPDATE ON final_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance (safe for existing databases)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(enrollment_status);

CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_id ON course_instructors(instructor_id);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_course_id ON invitations(course_id);

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_ai_assessments_submission_id ON ai_assessments(submission_id);
CREATE INDEX IF NOT EXISTS idx_final_grades_submission_id ON final_grades(submission_id);

-- Enable Row Level Security (safe for existing tables)
DO $$ BEGIN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- Note: coursework_assignments RLS removed as table doesn't exist

DO $$ BEGIN
    ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- RLS Policies for profiles (safe for existing databases)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Fix infinite recursion: Don't query profiles table in profiles policies
-- Temporary solution: Allow all authenticated users to read profiles
-- (More secure solution would use service role for admin operations)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles" ON profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can only update their own profile (admins should use service role)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- RLS Policies for courses
DROP POLICY IF EXISTS "Users can view active courses" ON courses;
DROP POLICY IF EXISTS "Users can view active courses" ON courses;
CREATE POLICY "Users can view active courses" ON courses FOR SELECT 
USING (status = 'active');

DROP POLICY IF EXISTS "Course instructors can view their courses" ON courses;
DROP POLICY IF EXISTS "Course instructors can view their courses" ON courses;
CREATE POLICY "Course instructors can view their courses" ON courses FOR SELECT 
USING (
  id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage all courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON courses;
CREATE POLICY "Admins can manage all courses" ON courses FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Course leaders can create courses" ON courses;
DROP POLICY IF EXISTS "Course leaders can create courses" ON courses;
CREATE POLICY "Course leaders can create courses" ON courses FOR INSERT
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('course_leader', 'admin'));

DROP POLICY IF EXISTS "Course instructors can update their courses" ON courses;
DROP POLICY IF EXISTS "Course instructors can update their courses" ON courses;
CREATE POLICY "Course instructors can update their courses" ON courses FOR UPDATE
USING (
  id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- RLS Policies for course enrollments
DROP POLICY IF EXISTS "Students can view their own enrollments" ON course_enrollments;
CREATE POLICY "Students can view their own enrollments" ON course_enrollments FOR SELECT
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Course instructors can view enrollments in their courses" ON course_enrollments;
CREATE POLICY "Course instructors can view enrollments in their courses" ON course_enrollments FOR SELECT
USING (
  course_id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Course instructors can manage enrollments in their courses" ON course_enrollments;
CREATE POLICY "Course instructors can manage enrollments in their courses" ON course_enrollments FOR ALL
USING (
  course_id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- RLS Policies for course instructors
DROP POLICY IF EXISTS "Course instructors can view instructor assignments" ON course_instructors;
CREATE POLICY "Course instructors can view instructor assignments" ON course_instructors FOR SELECT
USING (
  instructor_id = auth.uid() OR
  course_id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Admins can manage course instructor assignments" ON course_instructors;
CREATE POLICY "Admins can manage course instructor assignments" ON course_instructors FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for invitations
DROP POLICY IF EXISTS "Admins and course leaders can view invitations" ON invitations;
CREATE POLICY "Admins and course leaders can view invitations" ON invitations FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'course_leader'));

DROP POLICY IF EXISTS "Admins and course leaders can create invitations" ON invitations;
CREATE POLICY "Admins and course leaders can create invitations" ON invitations FOR INSERT
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'course_leader'));

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
CREATE POLICY "Admins can delete invitations" ON invitations FOR DELETE
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Course leaders can delete their own invitations" ON invitations;
CREATE POLICY "Course leaders can delete their own invitations" ON invitations FOR DELETE
USING (
  invited_by = auth.uid() AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'course_leader'
);

-- RLS Policies for questions
DROP POLICY IF EXISTS "Course instructors can manage course questions" ON questions;
CREATE POLICY "Course instructors can manage course questions" ON questions FOR ALL
USING (
  course_id IS NULL OR -- Global questions
  course_id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Students can view questions from enrolled courses" ON questions;
CREATE POLICY "Students can view questions from enrolled courses" ON questions FOR SELECT
USING (
  course_id IS NULL OR -- Global questions
  course_id IN (
    SELECT course_id FROM course_enrollments 
    WHERE student_id = auth.uid() AND enrollment_status = 'active'
  )
);

-- RLS Policies for assignments
DROP POLICY IF EXISTS "Course instructors can manage course assignments" ON assignments;
CREATE POLICY "Course instructors can manage course assignments" ON assignments FOR ALL
USING (
  course_id IN (
    SELECT course_id FROM course_instructors WHERE instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Students can view assignments from enrolled courses" ON assignments;
CREATE POLICY "Students can view assignments from enrolled courses" ON assignments FOR SELECT
USING (
  course_id IN (
    SELECT course_id FROM course_enrollments 
    WHERE student_id = auth.uid() AND enrollment_status = 'active'
  )
);

-- Note: coursework_assignments policies removed as table doesn't exist

-- RLS Policies for submissions
DROP POLICY IF EXISTS "Students can manage submissions for enrolled courses" ON submissions;
CREATE POLICY "Students can manage submissions for enrolled courses" ON submissions FOR ALL
USING (
  student_id = auth.uid() AND
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN course_enrollments ce ON ce.course_id = a.course_id
    WHERE ce.student_id = auth.uid() AND ce.enrollment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Course instructors can view submissions from their courses" ON submissions;
CREATE POLICY "Course instructors can view submissions from their courses" ON submissions FOR SELECT
USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN course_instructors ci ON ci.course_id = a.course_id
    WHERE ci.instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Students can view their own submissions" ON submissions;
CREATE POLICY "Students can view their own submissions" ON submissions FOR SELECT
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Course leaders can view all submissions" ON submissions;
CREATE POLICY "Course leaders can view all submissions" ON submissions FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('course_leader', 'admin'));

-- RLS Policies for AI assessments
DROP POLICY IF EXISTS "Students can view AI assessments for enrolled courses" ON ai_assessments;
CREATE POLICY "Students can view AI assessments for enrolled courses" ON ai_assessments FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN course_enrollments ce ON ce.course_id = a.course_id
    WHERE s.student_id = auth.uid() AND ce.student_id = auth.uid() AND ce.enrollment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Course instructors can view AI assessments from their courses" ON ai_assessments;
CREATE POLICY "Course instructors can view AI assessments from their courses" ON ai_assessments FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN course_instructors ci ON ci.course_id = a.course_id
    WHERE ci.instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "System can insert AI assessments" ON ai_assessments;
CREATE POLICY "System can insert AI assessments" ON ai_assessments FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage AI assessments" ON ai_assessments;
CREATE POLICY "Admins can manage AI assessments" ON ai_assessments FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for final grades
DROP POLICY IF EXISTS "Students can view final grades for enrolled courses" ON final_grades;
CREATE POLICY "Students can view final grades for enrolled courses" ON final_grades FOR SELECT
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN course_enrollments ce ON ce.course_id = a.course_id
    WHERE s.student_id = auth.uid() AND ce.student_id = auth.uid() AND ce.enrollment_status = 'active'
  )
);

DROP POLICY IF EXISTS "Course instructors can manage final grades for their courses" ON final_grades;
CREATE POLICY "Course instructors can manage final grades for their courses" ON final_grades FOR ALL
USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN course_instructors ci ON ci.course_id = a.course_id
    WHERE ci.instructor_id = auth.uid()
  ) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Create sample courses for testing (only if admin user exists)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get admin user if exists
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    -- Only create sample courses if we have an admin user and they don't exist
    IF admin_id IS NOT NULL THEN
        -- Basic Dog Grooming
        INSERT INTO courses (title, description, short_description, status, duration_weeks, max_students, created_by)
        SELECT 'Basic Dog Grooming', 'Introduction to fundamental dog grooming techniques, safety protocols, and basic breed-specific styling.', 'Learn essential grooming skills', 'active', 8, 25, admin_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Basic Dog Grooming');
        
        -- Advanced Grooming Techniques
        INSERT INTO courses (title, description, short_description, status, duration_weeks, max_students, created_by)
        SELECT 'Advanced Grooming Techniques', 'Master advanced styling techniques, show grooming standards, and specialized breed cuts.', 'Advanced styling and show standards', 'active', 12, 15, admin_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Advanced Grooming Techniques');
        
        -- Dog Behavior & Handling
        INSERT INTO courses (title, description, short_description, status, duration_weeks, max_students, created_by)
        SELECT 'Dog Behavior & Handling', 'Understanding canine behavior, stress signals, and safe handling techniques for grooming.', 'Safe handling and behavior management', 'active', 6, 30, admin_id
        WHERE NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Dog Behavior & Handling');
    END IF;
END $$;

-- Success message
SELECT 'Complete schema with course management system created successfully!' as status;