-- Update Questions Schema to Match PROJECT.md Requirements
-- Created: 2025-08-27
-- Purpose: Update question_type enum and add missing fields

-- First, create the new question type enum with correct values
DO $$ BEGIN
    -- Drop the old enum and create new one with correct values
    -- We need to handle this carefully to avoid breaking existing data
    
    -- Step 1: Create new temporary enum
    CREATE TYPE question_type_new AS ENUM ('multiple_choice', 'short_text', 'long_text');
    
    -- Step 2: Add temporary column with new type
    ALTER TABLE questions ADD COLUMN type_new question_type_new;
    
    -- Step 3: Migrate existing data
    -- Map old enum values to new ones
    UPDATE questions SET type_new = CASE 
        WHEN type::text = 'multiple_choice' THEN 'multiple_choice'::question_type_new
        WHEN type::text = 'essay' THEN 'long_text'::question_type_new
        WHEN type::text = 'practical' THEN 'short_text'::question_type_new
        ELSE 'short_text'::question_type_new  -- Default fallback
    END;
    
    -- Step 4: Drop old column and enum
    ALTER TABLE questions DROP COLUMN type;
    DROP TYPE question_type;
    
    -- Step 5: Rename new column and type
    ALTER TYPE question_type_new RENAME TO question_type;
    ALTER TABLE questions RENAME COLUMN type_new TO type;
    
    -- Step 6: Make the column NOT NULL
    ALTER TABLE questions ALTER COLUMN type SET NOT NULL;
    
EXCEPTION
    WHEN duplicate_object THEN 
        -- If enum already exists with correct values, skip creation
        RAISE NOTICE 'question_type enum already updated';
END $$;

-- Add missing required fields to questions table
DO $$ BEGIN
    -- Add category field
    ALTER TABLE questions ADD COLUMN category TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'questions.category already exists';
END $$;

DO $$ BEGIN
    -- Add difficulty field  
    ALTER TABLE questions ADD COLUMN difficulty TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'questions.difficulty already exists';
END $$;

DO $$ BEGIN
    -- Add rubric field
    ALTER TABLE questions ADD COLUMN rubric TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'questions.rubric already exists';
END $$;

-- Update existing questions to have default values for new required fields
-- This prevents NULL constraint violations
UPDATE questions 
SET 
    category = COALESCE(category, 'general'),
    difficulty = COALESCE(difficulty, 'beginner'), 
    rubric = COALESCE(rubric, 'Standard assessment rubric')
WHERE category IS NULL OR difficulty IS NULL OR rubric IS NULL;

-- Make the new fields NOT NULL after populating defaults
ALTER TABLE questions ALTER COLUMN category SET NOT NULL;
ALTER TABLE questions ALTER COLUMN difficulty SET NOT NULL; 
ALTER TABLE questions ALTER COLUMN rubric SET NOT NULL;

-- Add constraints for valid difficulty levels
DO $$ BEGIN
    ALTER TABLE questions ADD CONSTRAINT questions_difficulty_check 
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'));
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'questions_difficulty_check constraint already exists';
END $$;

-- Update the updated_at timestamp for schema changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger exists for questions table
DO $$ BEGIN
    CREATE TRIGGER update_questions_updated_at 
        BEFORE UPDATE ON questions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'update_questions_updated_at trigger already exists';
END $$;