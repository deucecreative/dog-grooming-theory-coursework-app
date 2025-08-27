-- Seed data for development
-- Note: This file should be run after the initial schema migration

-- Insert sample questions for dog grooming theory
INSERT INTO questions (title, content, type, expected_answer, rubric, options) VALUES
(
    'Dog Coat Types',
    'What are the main differences between a double coat and a single coat on a dog?',
    'long_text',
    'A double coat consists of a soft, dense undercoat and a longer, coarser outer coat (guard hairs), providing insulation and protection. A single coat has only one layer of hair without the undercoat, typically requiring different grooming techniques.',
    '{"criteria": ["Understanding of coat structure", "Identification of differences", "Grooming implications"], "max_score": 100}',
    NULL
),
(
    'Grooming Tools',
    'Which tool is best for removing loose undercoat from a Golden Retriever?',
    'multiple_choice',
    'undercoat_rake',
    '{"max_score": 100}',
    '["slicker_brush", "undercoat_rake", "pin_brush", "bristle_brush"]'
),
(
    'Safety First',
    'List three essential safety considerations when grooming an anxious dog.',
    'short_text',
    'Calm environment, secure restraint, gradual introduction to tools',
    '{"criteria": ["Mentions safety restraints", "Considers dog''s emotional state", "Equipment safety"], "max_score": 100}',
    NULL
),
(
    'Breed-Specific Grooming',
    'Describe the proper grooming technique for a Poodle''s face, including the tools needed and safety considerations.',
    'long_text',
    'Use a #30 or #40 blade on electric clippers for close shave. Start with chin, work upward to cheeks, be extremely careful around eyes. Use thinning shears for blending. Always ensure proper restraint and take breaks if dog becomes stressed.',
    '{"criteria": ["Correct blade size", "Proper technique description", "Safety considerations", "Tool identification"], "max_score": 100}',
    NULL
),
(
    'Nail Care',
    'What is the quick in a dog''s nail?',
    'short_text',
    'The pink area inside the nail that contains blood vessels and nerves',
    '{"max_score": 100}',
    NULL
);

-- Insert sample coursework assignment
-- Note: In a real application, you would need actual user IDs
-- This is just for demonstration purposes
INSERT INTO coursework_assignments (title, description, question_ids, student_ids, due_date) VALUES
(
    'Basic Grooming Theory - Module 1',
    'Introduction to dog grooming fundamentals covering coat types, tools, and safety.',
    (SELECT ARRAY_AGG(id) FROM questions LIMIT 3),
    '{}', -- Empty array - will be populated with actual student IDs
    NOW() + INTERVAL '2 weeks'
);

-- Sample data comments
-- The following would typically be added through the application:
-- 1. User profiles (created automatically on signup)
-- 2. Student submissions
-- 3. AI assessments
-- 4. Final grades

-- Create some sample options for the multiple choice question
UPDATE questions 
SET options = jsonb_build_array(
    jsonb_build_object('id', 'slicker_brush', 'text', 'Slicker Brush'),
    jsonb_build_object('id', 'undercoat_rake', 'text', 'Undercoat Rake'),
    jsonb_build_object('id', 'pin_brush', 'text', 'Pin Brush'),
    jsonb_build_object('id', 'bristle_brush', 'text', 'Bristle Brush')
)
WHERE type = 'multiple_choice';