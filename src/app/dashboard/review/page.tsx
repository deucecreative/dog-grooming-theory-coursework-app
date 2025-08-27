import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReviewPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Submissions</CardTitle>
          <CardDescription>
            Review and grade student assignment submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to review student submissions,
            provide feedback, and assign grades here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}