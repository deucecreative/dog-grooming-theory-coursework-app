'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import type { Question } from '@/types/database'

interface QuestionsResponse {
  questions: Question[]
  total: number
  page: number
  limit: number
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  const { profile } = useSupabase()
  const { toast } = useToast()

  const fetchQuestions = useCallback(async () => {
    if (!profile) {
      return
    }

    try {
      const response = await fetch('/api/questions')
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }
      
      const data: QuestionsResponse = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [profile, toast])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const resetFilters = () => {
    setCategoryFilter('all')
    setDifficultyFilter('all') 
    setTypeFilter('all')
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice'
      case 'short_text':
        return 'Short Text'
      case 'long_text':
        return 'Long Text'
      default:
        return type
    }
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to view questions.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading questions...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>
              Browse and practice questions from the theory coursework
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>No questions available. Please check back later for practice questions.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Question Bank</h1>
        <p className="text-gray-600">Browse and practice questions from the theory coursework</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="difficulty-filter">Difficulty</Label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger id="difficulty-filter">
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type-filter">Question Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{question.title}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">{question.category}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="default">{getQuestionTypeLabel(question.type)}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{question.content}</p>
              
              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  <h4 className="font-medium">Options:</h4>
                  <div className="space-y-1">
                    {Object.entries(question.options as Record<string, string>).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {key.toUpperCase()}
                        </span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}