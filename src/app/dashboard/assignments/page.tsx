import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AssignmentsPage() {
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
            This feature is coming soon. You&apos;ll be able to view your assignments,
            track due dates, and submit completed work here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}