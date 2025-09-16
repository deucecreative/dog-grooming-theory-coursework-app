export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'course_leader' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type QuestionType = 'multiple_choice' | 'short_text' | 'long_text'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type SubmissionStatus = 'draft' | 'submitted' | 'graded'
export type GradeStatus = 'pass' | 'fail'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type CourseStatus = 'draft' | 'active' | 'archived'
export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn' | 'suspended'
export type InstructorRole = 'instructor' | 'assistant' | 'grader'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          status: UserStatus
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: UserRole
          status?: UserStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          status?: UserStatus
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          title: string
          content: string
          type: QuestionType
          category: string
          difficulty: string
          options: Json | null
          rubric: Json
          expected_answer: string | null
          created_by: string
          course_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: QuestionType
          category: string
          difficulty: string
          options?: Json | null
          rubric: Json
          expected_answer?: string | null
          created_by: string
          course_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: QuestionType
          category?: string
          difficulty?: string
          options?: Json | null
          rubric?: Json
          expected_answer?: string | null
          created_by?: string
          course_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          title: string
          description: string
          question_ids: string[]
          due_date: string
          created_by: string
          course_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          question_ids: string[]
          due_date: string
          created_by: string
          course_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          question_ids?: string[]
          due_date?: string
          created_by?: string
          course_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          assignment_id: string
          student_id: string
          answers: Json
          status: SubmissionStatus
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          student_id: string
          answers: Json
          status?: SubmissionStatus
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          student_id?: string
          answers?: Json
          status?: SubmissionStatus
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_assessments: {
        Row: {
          id: string
          submission_id: string
          content_score: number | null
          technical_accuracy: number | null
          completeness: number | null
          overall_score: number | null
          feedback: string | null
          suggestions: Json | null
          processed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          content_score?: number | null
          technical_accuracy?: number | null
          completeness?: number | null
          overall_score?: number | null
          feedback?: string | null
          suggestions?: Json | null
          processed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          content_score?: number | null
          technical_accuracy?: number | null
          completeness?: number | null
          overall_score?: number | null
          feedback?: string | null
          suggestions?: Json | null
          processed_at?: string
          created_at?: string
        }
      }
      final_grades: {
        Row: {
          id: string
          submission_id: string
          course_leader_id: string
          final_score: number
          comments: string | null
          status: GradeStatus
          graded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          course_leader_id: string
          final_score: number
          comments?: string | null
          status: GradeStatus
          graded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          course_leader_id?: string
          final_score?: number
          comments?: string | null
          status?: GradeStatus
          graded_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          short_description: string | null
          status: CourseStatus
          duration_weeks: number | null
          max_students: number | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          short_description?: string | null
          status?: CourseStatus
          duration_weeks?: number | null
          max_students?: number | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          short_description?: string | null
          status?: CourseStatus
          duration_weeks?: number | null
          max_students?: number | null
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      course_enrollments: {
        Row: {
          id: string
          course_id: string
          student_id: string
          enrolled_at: string
          enrollment_status: EnrollmentStatus
          completion_percentage: number
          final_grade: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          student_id: string
          enrolled_at?: string
          enrollment_status?: EnrollmentStatus
          completion_percentage?: number
          final_grade?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          student_id?: string
          enrolled_at?: string
          enrollment_status?: EnrollmentStatus
          completion_percentage?: number
          final_grade?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      course_instructors: {
        Row: {
          id: string
          course_id: string
          instructor_id: string
          role: InstructorRole
          assigned_at: string
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          instructor_id: string
          role?: InstructorRole
          assigned_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          instructor_id?: string
          role?: InstructorRole
          assigned_at?: string
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          token: string
          email: string
          role: UserRole
          invited_by: string
          course_id: string | null
          expires_at: string
          used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token?: string
          email: string
          role: UserRole
          invited_by: string
          course_id?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          token?: string
          email?: string
          role?: UserRole
          invited_by?: string
          course_id?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      question_type: QuestionType
      submission_status: SubmissionStatus
      grade_status: GradeStatus
      confidence_level: ConfidenceLevel
      course_status: CourseStatus
      enrollment_status: EnrollmentStatus
      instructor_role: InstructorRole
    }
  }
}

// Export convenience types for common table rows
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type Assignment = Database['public']['Tables']['assignments']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type AIAssessment = Database['public']['Tables']['ai_assessments']['Row']