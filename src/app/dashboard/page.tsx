'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSupabase } from "@/hooks/use-supabase";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Users, UserCheck } from "lucide-react";

export default function DashboardPage() {
  const { profile } = useSupabase();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [pendingUsers, setPendingUsers] = useState<number>(0);
  const router = useRouter();
  
  // Real data integration state
  const [activeAssignmentsCount, setActiveAssignmentsCount] = useState<number>(0);
  const [completedAssignmentsData, setCompletedAssignmentsData] = useState<{count: number, averageScore: number}>({count: 0, averageScore: 0});
  const [pendingReviewCount, setPendingReviewCount] = useState<number>(0);
  const [recentAssignments, setRecentAssignments] = useState<Array<{
    id: string;
    title: string;
    status: string;
    completed_questions?: number;
    total_questions?: number;
    progress_percentage: number;
    score?: number;
    due_date?: string;
  }>>([]);
  const [activeStudentsCount, setActiveStudentsCount] = useState<number>(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [userStats, setUserStats] = useState<{total_users: number, course_leaders: number, students: number, new_this_month: number}>({
    total_users: 0, course_leaders: 0, students: 0, new_this_month: 0
  });

  const fetchPendingUsersCount = async () => {
    try {
      console.log('🔍 Fetching pending users count...');
      const response = await fetch('/api/users?status=pending');
      console.log('Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const text = await response.text();
        console.log('Response text:', text);
        
        if (text && text.trim()) {
          try {
            const data = JSON.parse(text);
            console.log('Parsed data:', data);
            console.log('Users array length:', data.users?.length || 0);
            setPendingUsers(data.users?.length || 0);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response text that failed to parse:', text);
            setPendingUsers(0);
          }
        } else {
          console.log('Empty response text');
          setPendingUsers(0);
        }
      } else {
        console.error('Failed to fetch pending users:', response.status, response.statusText);
        // Try to read the error response
        try {
          const errorText = await response.text();
          console.error('Error response:', errorText);
        } catch (e) {
          console.error('Could not read error response:', e);
        }
        setPendingUsers(0);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setPendingUsers(0);
    }
  };

  const fetchApiData = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            return JSON.parse(text);
          } catch (parseError) {
            console.error(`JSON parse error for ${url}:`, parseError);
            return null;
          }
        }
      } else {
        console.error(`API error for ${url}:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`Network error for ${url}:`, error);
    }
    return null;
  }, []);

  const fetchStudentDashboardData = useCallback(async () => {
    try {
      // Fetch active assignments
      const activeData = await fetchApiData('/api/assignments/active');
      if (activeData) {
        setActiveAssignmentsCount(activeData.assignments?.length || 0);
      }

      // Fetch completed assignments
      const completedData = await fetchApiData('/api/assignments/completed');
      if (completedData) {
        const assignments = completedData.assignments || [];
        const count = assignments.length;
        const averageScore = assignments.length > 0 
          ? Math.round(assignments.reduce((sum: number, assignment: {score: number}) => sum + assignment.score, 0) / assignments.length)
          : 0;
        setCompletedAssignmentsData({ count, averageScore });
      }

      // Fetch pending review assignments
      const pendingData = await fetchApiData('/api/assignments/pending-review');
      if (pendingData) {
        setPendingReviewCount(pendingData.assignments?.length || 0);
      }

      // Fetch recent assignments
      const recentData = await fetchApiData('/api/assignments/recent');
      if (recentData) {
        setRecentAssignments(recentData.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    }
  }, [fetchApiData, setActiveAssignmentsCount, setCompletedAssignmentsData, setPendingReviewCount, setRecentAssignments]);

  const fetchCourseLeaderDashboardData = useCallback(async () => {
    try {
      // Fetch active students
      const studentsData = await fetchApiData('/api/students/active');
      if (studentsData) {
        setActiveStudentsCount(studentsData.students?.length || 0);
      }

      // Fetch pending reviews
      const reviewsData = await fetchApiData('/api/submissions/pending-review');
      if (reviewsData) {
        setPendingReviewsCount(reviewsData.submissions?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching course leader dashboard data:', error);
    }
  }, [fetchApiData, setActiveStudentsCount, setPendingReviewsCount]);

  const fetchAdminDashboardData = useCallback(async () => {
    try {
      // Fetch user statistics
      const statsData = await fetchApiData('/api/admin/users/stats');
      if (statsData) {
        setUserStats({
          total_users: statsData.total_users || 0,
          course_leaders: statsData.course_leaders || 0,
          students: statsData.students || 0,
          new_this_month: statsData.new_this_month || 0
        });
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    }
  }, [fetchApiData, setUserStats]);

  useEffect(() => {
    if (profile) {
      setIsApproved(profile.status === 'approved');
      
      // Fetch pending users count for admins and course leaders
      if (profile.role === 'admin' || profile.role === 'course_leader') {
        fetchPendingUsersCount();
      }

      // Fetch real data based on user role (only for approved users)
      if (profile.status === 'approved') {
        if (profile.role === 'student') {
          fetchStudentDashboardData();
        } else if (profile.role === 'course_leader') {
          fetchCourseLeaderDashboardData();
        } else if (profile.role === 'admin') {
          fetchAdminDashboardData();
        }
      }
    }
  }, [profile, fetchStudentDashboardData, fetchCourseLeaderDashboardData, fetchAdminDashboardData]);

  // Show loading state while checking approval status
  if (isApproved === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Loading your account status...</p>
        </div>
      </div>
    );
  }

  // Show pending approval message based on role
  if (!isApproved) {
    const isStudent = profile?.role === 'student'
    const isCourseLeader = profile?.role === 'course_leader'
    
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Your account is pending approval</p>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Account Pending Approval</CardTitle>
            <CardDescription className="text-orange-700">
              {isStudent && "Your account has been created successfully but requires approval from a course leader before you can access coursework."}
              {isCourseLeader && "Your course leader account has been created and is pending approval from an administrator."}
              {!isStudent && !isCourseLeader && "Your account has been created and is pending approval."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-orange-800">
                <strong>What happens next:</strong>
              </p>
              <ul className="text-sm text-orange-700 space-y-1 ml-4">
                {isStudent && (
                  <>
                    <li>• A course leader will review your account</li>
                    <li>• You&apos;ll receive access to assignments once approved</li>
                    <li>• This usually takes 1-2 business days</li>
                  </>
                )}
                {isCourseLeader && (
                  <>
                    <li>• An administrator will review your account</li>
                    <li>• You&apos;ll gain access to course management tools once approved</li>
                    <li>• You&apos;ll be able to create assignments and manage students</li>
                  </>
                )}
                {!isStudent && !isCourseLeader && (
                  <>
                    <li>• Your account will be reviewed by an administrator</li>
                    <li>• Access will be granted based on your role</li>
                  </>
                )}
              </ul>
              <p className="text-sm text-orange-600">
                {isStudent && "If you have questions, please contact your course leader directly."}
                {isCourseLeader && "If you have questions, please contact an administrator."}
                {!isStudent && !isCourseLeader && "If you have questions, please contact an administrator."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show full dashboard for approved users
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {profile?.role === 'student' && "Welcome to your coursework management system"}
          {profile?.role === 'course_leader' && "Welcome to your course management dashboard"}
          {profile?.role === 'admin' && "Welcome to the platform administration dashboard"}
        </p>
      </div>

      {/* Pending approvals notification for admins and course leaders */}
      {(profile?.role === 'admin' || profile?.role === 'course_leader') && pendingUsers > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>{pendingUsers}</strong> user{pendingUsers > 1 ? 's' : ''} awaiting approval.
              </span>
              <Button
                size="sm"
                onClick={() => router.push(profile?.role === 'admin' ? '/admin/users' : '/dashboard/students')}
                className="ml-4"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {profile?.role === 'admin' ? 'Review Users' : 'Review Students'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Role-specific dashboard content */}
      {profile?.role === 'student' && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Assignments</CardTitle>
                <CardDescription>Coursework currently in progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{activeAssignmentsCount}</div>
                <p className="text-sm text-gray-600">2 due this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed Work</CardTitle>
                <CardDescription>Finished assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{completedAssignmentsData.count}</div>
                <p className="text-sm text-gray-600">{completedAssignmentsData.averageScore}% average score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Review</CardTitle>
                <CardDescription>Awaiting course leader feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingReviewCount}</div>
                <p className="text-sm text-gray-600">Will be reviewed soon</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Assignments</CardTitle>
              <CardDescription>Your latest coursework progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentAssignments.length > 0 ? recentAssignments.map((assignment) => (
                <div key={assignment.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{assignment.title}</h4>
                      <p className="text-sm text-gray-600">
                        {assignment.status === 'in_progress' && assignment.completed_questions && assignment.total_questions && 
                          `${assignment.completed_questions} of ${assignment.total_questions} questions completed`
                        }
                        {assignment.status === 'completed' && assignment.score && 
                          `Completed - Score: ${assignment.score}%`
                        }
                        {assignment.status === 'not_started' && assignment.due_date && 
                          `Due in 3 days`
                        }
                      </p>
                    </div>
                    <Button size="sm" variant={assignment.status === 'completed' ? 'outline' : 'default'}>
                      {assignment.status === 'completed' ? 'Review' : assignment.status === 'not_started' ? 'Start' : 'Continue'}
                    </Button>
                  </div>
                  <Progress value={assignment.progress_percentage} className="h-2" />
                </div>
              )) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">No recent assignments</h4>
                      <p className="text-sm text-gray-600">Check back later for new coursework</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {profile?.role === 'course_leader' && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Students</CardTitle>
                <CardDescription>Students enrolled in your courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{activeStudentsCount}</div>
                <p className="text-sm text-gray-600">3 new this week</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => router.push('/dashboard/students')}
                >
                  Manage Students
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Reviews</CardTitle>
                <CardDescription>Student submissions awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{pendingReviewsCount}</div>
                <p className="text-sm text-gray-600">2 overdue</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => router.push('/dashboard/review')}
                >
                  Review Submissions
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Bank</CardTitle>
                <CardDescription>Available questions for assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">156</div>
                <p className="text-sm text-gray-600">12 recently added</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => router.push('/dashboard')}
                >
                  Manage Questions
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest student submissions and activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Sarah Johnson completed &ldquo;Grooming Safety&rdquo;</h4>
                  <p className="text-sm text-gray-600">Score: 94% • 2 hours ago</p>
                </div>
                <Button size="sm" variant="outline">Review</Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Mike Chen submitted &ldquo;Breed Identification&rdquo;</h4>
                  <p className="text-sm text-gray-600">Awaiting review • 4 hours ago</p>
                </div>
                <Button size="sm" variant="outline">Review</Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">New student registration: Emma Wilson</h4>
                  <p className="text-sm text-gray-600">Pending approval • 1 day ago</p>
                </div>
                <Button size="sm" variant="outline">Approve</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {profile?.role === 'admin' && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Users</CardTitle>
                <CardDescription>Active platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{userStats.total_users}</div>
                <p className="text-sm text-gray-600">+{userStats.new_this_month} this month</p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => router.push('/admin/users')}
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Leaders</CardTitle>
                <CardDescription>Active instructors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{userStats.course_leaders}</div>
                <p className="text-sm text-gray-600">All approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Students</CardTitle>
                <CardDescription>Enrolled students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{userStats.students}</div>
                <p className="text-sm text-gray-600">92% active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Health</CardTitle>
                <CardDescription>Platform performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">98%</div>
                <p className="text-sm text-gray-600">Uptime this month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Activity</CardTitle>
                <CardDescription>Recent system activities and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">New course leader registered</h4>
                    <p className="text-sm text-gray-600">Dr. Amanda Roberts • Needs approval</p>
                  </div>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Bulk invitation sent</h4>
                    <p className="text-sm text-gray-600">25 students invited by John Smith</p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">System backup completed</h4>
                    <p className="text-sm text-gray-600">Daily backup • 3:00 AM</p>
                  </div>
                  <div className="text-green-600 text-sm">✓ Success</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => router.push('/admin/invitations')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Send Invitations
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => router.push('/admin/users')}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Review Pending Users
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => router.push('/admin')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Manage Questions
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => router.push('/admin/users')}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}