-- Fix RLS policies to avoid infinite recursion
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Course leaders can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Course leaders and admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Students can view assigned questions" ON questions;
DROP POLICY IF EXISTS "Course leaders and admins can manage assignments" ON coursework_assignments;
DROP POLICY IF EXISTS "Students can view their assignments" ON coursework_assignments;
DROP POLICY IF EXISTS "Students can manage their own submissions" ON submissions;
DROP POLICY IF EXISTS "Course leaders can view all submissions" ON submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON submissions;
DROP POLICY IF EXISTS "Students can view their AI assessments" ON ai_assessments;
DROP POLICY IF EXISTS "Course leaders can view all AI assessments" ON ai_assessments;
DROP POLICY IF EXISTS "System can insert AI assessments" ON ai_assessments;
DROP POLICY IF EXISTS "Admins can manage AI assessments" ON ai_assessments;
DROP POLICY IF EXISTS "Students can view their final grades" ON final_grades;
DROP POLICY IF EXISTS "Course leaders can manage final grades" ON final_grades;
DROP POLICY IF EXISTS "Admins can view all final grades" ON final_grades;

-- Create safer RLS policies using auth.jwt() to avoid recursion

-- Profiles policies - use auth.jwt() instead of profiles table lookup
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Course leaders can view student profiles" ON profiles FOR SELECT 
USING (
  (auth.jwt() ->> 'role')::text = 'course_leader' AND role = 'student'
  OR 
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL 
USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Questions policies
CREATE POLICY "Course leaders and admins can manage questions" ON questions FOR ALL 
USING ((auth.jwt() ->> 'role')::text IN ('course_leader', 'admin'));

CREATE POLICY "Students can view assigned questions" ON questions FOR SELECT 
USING (
  auth.uid() = ANY(
    SELECT UNNEST(student_ids) 
    FROM coursework_assignments 
    WHERE questions.id = ANY(question_ids)
  )
);

-- Coursework assignments policies
CREATE POLICY "Course leaders and admins can manage assignments" ON coursework_assignments FOR ALL 
USING ((auth.jwt() ->> 'role')::text IN ('course_leader', 'admin'));

CREATE POLICY "Students can view their assignments" ON coursework_assignments FOR SELECT 
USING (auth.uid() = ANY(student_ids));

-- Submissions policies
CREATE POLICY "Students can manage their own submissions" ON submissions FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Course leaders can view all submissions" ON submissions FOR SELECT 
USING ((auth.jwt() ->> 'role')::text = 'course_leader');

CREATE POLICY "Admins can view all submissions" ON submissions FOR SELECT 
USING ((auth.jwt() ->> 'role')::text = 'admin');

-- AI assessments policies
CREATE POLICY "Students can view their AI assessments" ON ai_assessments FOR SELECT 
USING (
  submission_id IN (
    SELECT id FROM submissions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Course leaders can view all AI assessments" ON ai_assessments FOR SELECT 
USING ((auth.jwt() ->> 'role')::text = 'course_leader');

CREATE POLICY "System can insert AI assessments" ON ai_assessments FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage AI assessments" ON ai_assessments FOR ALL 
USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Final grades policies
CREATE POLICY "Students can view their final grades" ON final_grades FOR SELECT 
USING (
  submission_id IN (
    SELECT id FROM submissions WHERE student_id = auth.uid()
  )
);

CREATE POLICY "Course leaders can manage final grades" ON final_grades FOR ALL 
USING ((auth.jwt() ->> 'role')::text = 'course_leader');

CREATE POLICY "Admins can view all final grades" ON final_grades FOR SELECT 
USING ((auth.jwt() ->> 'role')::text = 'admin');