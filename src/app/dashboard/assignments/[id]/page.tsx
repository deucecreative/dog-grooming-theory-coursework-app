'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { useSupabase } from '@/hooks/use-supabase'
import type { Assignment, Question } from '@/types/database'

type AssignmentWithQuestions = Assignment & {
  questions: Question[]
}

type Submission = {
  id: string
  assignment_id: string
  answers: Record<string, string>
  status: 'draft' | 'submitted'
  created_at: string
  updated_at: string
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useSupabase()
  
  const [assignment, setAssignment] = useState<AssignmentWithQuestions | null>(null)
  const [_submission, setSubmission] = useState<Submission | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const assignmentId = params.id as string

  const fetchAssignment = useCallback(async () => {
    if (!user || !profile) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}?expand=questions`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Assignment not found')
          return
        }
        throw new Error('Failed to fetch assignment')
      }
      
      const data = await response.json()
      setAssignment(data.assignment)
      
      // Fetch existing submission
      const submissionResponse = await fetch(`/api/submissions?assignment_id=${assignmentId}`)
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        if (submissionData.submissions && submissionData.submissions.length > 0) {
          const existingSubmission = submissionData.submissions[0]
          setSubmission(existingSubmission)
          setAnswers(existingSubmission.answers || {})
        }
      }
    } catch (error) {
      console.error('Error fetching assignment:', error)
      setError('Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }, [user, profile, assignmentId])

  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    
    try {
      setSaving(true)
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          answers: newAnswers,
          status: 'draft',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save')
      }
      
      const data = await response.json()
      setSubmission(data.submission)
    } catch (error) {
      console.error('Error saving answer:', error)
      setSaveError('Save failed - please try again')
    } finally {
      setSaving(false)
    }
  }, [answers, assignmentId])

  const submitAssignment = useCallback(async () => {
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          answers,
          status: 'submitted',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit')
      }
      
      router.push('/dashboard/assignments')
    } catch (error) {
      console.error('Error submitting assignment:', error)
      setError('Submission failed - please try again')
    }
    setShowSubmitDialog(false)
  }, [answers, assignmentId, router])

  useEffect(() => {
    fetchAssignment()
  }, [fetchAssignment])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Assignment...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your assignment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assignment Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested assignment could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatDueDate = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    return dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const answeredQuestions = Object.keys(answers).length
  const totalQuestions = assignment.questions.length
  const progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0
  const allQuestionsAnswered = answeredQuestions === totalQuestions

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{assignment.title}</h1>
          <p className="text-muted-foreground">{assignment.description}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Due: {formatDueDate(assignment.due_date)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{answeredQuestions} of {totalQuestions} questions completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {saving && (
          <div className="text-sm text-muted-foreground">
            Saving...
          </div>
        )}
        
        {!saving && Object.keys(answers).length > 0 && (
          <div className="text-sm text-muted-foreground">
            Saved
          </div>
        )}

        <div className="space-y-6">
          {assignment.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}: {question.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>{question.content}</p>
                  
                  {question.type === 'short_text' && (
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}`}>Your Answer:</Label>
                      <Input
                        id={`question-${question.id}`}
                        aria-label={question.title}
                        value={answers[question.id] || ''}
                        onChange={(e) => saveAnswer(question.id, e.target.value)}
                        placeholder="Enter your answer..."
                      />
                    </div>
                  )}
                  
                  {question.type === 'multiple_choice' && question.options && Array.isArray(question.options) && (
                    <div className="space-y-2">
                      <Label>Select your answer:</Label>
                      <div role="radiogroup" className="space-y-2">
                        {(question.options as string[]).map((option: string, optionIndex: number) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              id={`${question.id}-${optionIndex}`}
                              checked={answers[question.id] === option}
                              onChange={() => saveAnswer(question.id, option)}
                              className="mr-2"
                            />
                            <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {question.type === 'long_text' && (
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}`}>Your Answer:</Label>
                      <Textarea
                        id={`question-${question.id}`}
                        aria-label={question.title}
                        value={answers[question.id] || ''}
                        onChange={(e) => saveAnswer(question.id, e.target.value)}
                        placeholder="Enter your detailed answer..."
                        rows={6}
                      />
                      <div className="text-sm text-muted-foreground">
                        {(answers[question.id] || '').length} characters
                      </div>
                    </div>
                  )}
                  
                  {question.rubric && (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Grading Rubric:</strong> {typeof question.rubric === 'string' ? question.rubric : 'See assignment instructions'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            Back to Assignments
          </Button>
          
          {allQuestionsAnswered && (
            <Button onClick={() => setShowSubmitDialog(true)}>
              Submit Assignment
            </Button>
          )}
        </div>

        {saveError && (
          <div className="text-sm text-destructive">
            {saveError}
          </div>
        )}

        {showSubmitDialog && (
          <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background p-6 rounded-lg border shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Submission</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to submit this assignment? Once submitted, you cannot make further changes.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={submitAssignment}>
                  Confirm
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}