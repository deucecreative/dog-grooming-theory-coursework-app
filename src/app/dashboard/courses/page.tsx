import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CoursesPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>
            View and manage your assigned courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to view your assigned courses,
            manage course content, and track student progress here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}