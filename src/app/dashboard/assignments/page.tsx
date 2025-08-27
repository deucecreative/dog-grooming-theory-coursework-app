'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useSupabase } from '@/hooks/use-supabase'
import type { Assignment } from '@/types/database'

type AssignmentWithQuestions = Assignment & {
  questions: Array<{ id: string; title: string; content: string; type: string }>
  progress?: {
    answered: number
    total: number
    percentage: number
  }
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useSupabase()

  const fetchAssignments = useCallback(async () => {
    if (!user || !profile) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/assignments?expand=questions')
      if (!response.ok) {
        throw new Error('Failed to fetch assignments')
      }
      const data = await response.json()
      setAssignments(data.assignments || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const formatDueDate = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    return dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Assignments</CardTitle>
            <CardDescription>
              View your assigned coursework and submit completed work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Loading assignments...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>My Assignments</CardTitle>
            <CardDescription>
              View your assigned coursework and submit completed work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No assignments available at the moment.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">
            View your assigned coursework and submit completed work
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{assignment.title}</CardTitle>
                <CardDescription>{assignment.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Due: {formatDueDate(assignment.due_date)}</span>
                    <span>{assignment.questions?.length || 0} {(assignment.questions?.length || 0) === 1 ? 'question' : 'questions'}</span>
                  </div>
                  
                  {assignment.progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{assignment.progress.answered} of {assignment.progress.total} completed</span>
                        <span>{assignment.progress.percentage}%</span>
                      </div>
                      <Progress value={assignment.progress.percentage} className="h-2" />
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <Link href={`/dashboard/assignments/${assignment.id}`}>
                    <Button 
                      className="w-full"
                      variant={assignment.progress?.percentage === 100 ? "outline" : "default"}
                    >
                      {assignment.progress?.percentage === 100 ? 'Review' : 
                       assignment.progress?.answered ? 'Continue' : 'Start Assignment'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}