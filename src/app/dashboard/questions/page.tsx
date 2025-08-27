import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function QuestionsPage() {
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
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to browse practice questions,
            take quizzes, and track your progress here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}