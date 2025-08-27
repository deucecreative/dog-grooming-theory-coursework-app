import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminQuestionsPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Question Management</CardTitle>
          <CardDescription>
            Create, edit, and organize course questions and assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon. You&apos;ll be able to create and manage
            questions, organize them into categories, and build assessments here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}