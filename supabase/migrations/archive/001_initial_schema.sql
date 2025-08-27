-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('student', 'course_leader', 'admin');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'short_text', 'long_text');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'graded');
CREATE TYPE grade_status AS ENUM ('pass', 'fail');
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type question_type NOT NULL,
    expected_answer TEXT,
    rubric JSONB,
    options JSONB, -- For multiple choice questions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create coursework assignments table
CREATE TABLE coursework_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    question_ids UUID[] NOT NULL,
    student_ids UUID[] NOT NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coursework_id UUID REFERENCES coursework_assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    status submission_status DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coursework_id, student_id, question_id)
);

-- Create AI assessments table
CREATE TABLE ai_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    ai_score DECIMAL(5,2) NOT NULL CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_feedback TEXT NOT NULL,
    confidence_level confidence_level NOT NULL,
    assessment_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id)
);

-- Create final grades table
CREATE TABLE final_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    course_leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    final_score DECIMAL(5,2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
    comments TEXT,
    status grade_status NOT NULL,
    graded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coursework_assignments_updated_at BEFORE UPDATE ON coursework_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_final_grades_updated_at BEFORE UPDATE ON final_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Course leaders can view student profiles" ON profiles FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'course_leader') 
    AND role = 'student'
);
CREATE POLICY "Admins can view all profiles" ON profiles FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- RLS Policies for questions
CREATE POLICY "Course leaders and admins can manage questions" ON questions FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('course_leader', 'admin'))
);
CREATE POLICY "Students can view assigned questions" ON questions FOR SELECT USING (
    auth.uid() IN (
        SELECT UNNEST(student_ids) 
        FROM coursework_assignments 
        WHERE questions.id = ANY(question_ids)
    )
);

-- RLS Policies for coursework assignments
CREATE POLICY "Course leaders and admins can manage assignments" ON coursework_assignments FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('course_leader', 'admin'))
);
CREATE POLICY "Students can view their assignments" ON coursework_assignments FOR SELECT USING (
    auth.uid() = ANY(student_ids)
);

-- RLS Policies for submissions
CREATE POLICY "Students can manage their own submissions" ON submissions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Course leaders can view all submissions" ON submissions FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'course_leader')
);
CREATE POLICY "Admins can view all submissions" ON submissions FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- RLS Policies for AI assessments
CREATE POLICY "Students can view their AI assessments" ON ai_assessments FOR SELECT USING (
    submission_id IN (SELECT id FROM submissions WHERE student_id = auth.uid())
);
CREATE POLICY "Course leaders can view all AI assessments" ON ai_assessments FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'course_leader')
);
CREATE POLICY "System can insert AI assessments" ON ai_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage AI assessments" ON ai_assessments FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- RLS Policies for final grades
CREATE POLICY "Students can view their final grades" ON final_grades FOR SELECT USING (
    submission_id IN (SELECT id FROM submissions WHERE student_id = auth.uid())
);
CREATE POLICY "Course leaders can manage final grades" ON final_grades FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'course_leader')
);
CREATE POLICY "Admins can view all final grades" ON final_grades FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_coursework_assignments_created_by ON coursework_assignments(created_by);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_coursework_id ON submissions(coursework_id);
CREATE INDEX idx_submissions_question_id ON submissions(question_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_ai_assessments_submission_id ON ai_assessments(submission_id);
CREATE INDEX idx_final_grades_submission_id ON final_grades(submission_id);
CREATE INDEX idx_final_grades_course_leader_id ON final_grades(course_leader_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();