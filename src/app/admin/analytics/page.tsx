import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>
            View detailed analytics and insights about course performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to view student progress,
            course completion rates, and detailed performance analytics here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}