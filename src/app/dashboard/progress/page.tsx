import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProgressPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>My Progress</CardTitle>
          <CardDescription>
            Track your learning progress and course completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to view your progress,
            see completion statistics, and track your learning journey here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}