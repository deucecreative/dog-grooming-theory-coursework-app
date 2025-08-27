import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Users</CardTitle>
            <CardDescription>Active system users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">127</div>
            <p className="text-sm text-gray-600">+12 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Questions</CardTitle>
            <CardDescription>Total question bank</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">45</div>
            <p className="text-sm text-gray-600">3 pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignments</CardTitle>
            <CardDescription>Active coursework</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">8</div>
            <p className="text-sm text-gray-600">2 due this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Usage</CardTitle>
            <CardDescription>Assessments this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">342</div>
            <p className="text-sm text-gray-600">89% accuracy</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm font-medium">Database</p>
              <p className="text-xs text-gray-600">Healthy</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm font-medium">AI Service</p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">⚠</div>
              <p className="text-sm font-medium">Storage</p>
              <p className="text-xs text-gray-600">85% capacity</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}