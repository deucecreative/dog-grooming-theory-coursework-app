'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { UserRole, UserStatus } from '@/types/database'
import { CheckCircle, XCircle, Clock, User, Mail, Calendar, Shield } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: UserStatus
  created_at: string
  approved_at: string | null
  approved_by: string | null
  approved_profile?: {
    full_name: string
    email: string
  } | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set())
  
  const { profile } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Effect for authorization check only
  useEffect(() => {
    if (!profile) return
    
    if (profile.role !== 'admin' && profile.role !== 'course_leader') {
      router.push('/dashboard')
    }
  }, [profile, router])

  // Effect for data fetching only
  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin' && profile.role !== 'course_leader') return
    
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        const url = statusFilter === 'all' 
          ? '/api/users' 
          : `/api/users?status=${statusFilter}`
        
        const response = await fetch(url)
        
        if (!response || !response.ok) {
          throw new Error(`Failed to fetch users: ${response?.status || 'No response'}`)
        }
        
        const data = await response.json()
        setUsers(data.users || [])
      } catch (error) {
        console.error('Error fetching users:', error)
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        })
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [profile, statusFilter, toast]) // Include toast but it should be stable from useToast hook

  // Separate fetchUsers function for handleUpdateUserStatus
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const url = statusFilter === 'all' 
        ? '/api/users' 
        : `/api/users?status=${statusFilter}`
      
      const response = await fetch(url)
      
      if (!response || !response.ok) {
        throw new Error(`Failed to fetch users: ${response?.status || 'No response'}`)
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      })
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, toast])

  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    if (updatingUsers.has(userId)) return

    setUpdatingUsers(prev => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status')
      }

      toast({
        title: 'Success',
        description: `User ${newStatus === 'approved' ? 'approved' : 'status updated'} successfully`,
      })

      // Refresh users list
      await fetchUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle size={12} className="mr-1" />Rejected</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock size={12} className="mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800"><Shield size={12} className="mr-1" />Admin</Badge>
      case 'course_leader':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><User size={12} className="mr-1" />Course Leader</Badge>
      case 'student':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><User size={12} className="mr-1" />Student</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const pendingUsers = users.filter(u => u.status === 'pending')

  if (!profile || (profile.role !== 'admin' && profile.role !== 'course_leader')) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. This page is only available to administrators and course leaders.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600">
          {profile?.role === 'admin' ? 'Manage all user registrations and approvals' : 'Manage student approvals'}
        </p>
      </div>

      {pendingUsers.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingUsers.length}</strong> user{pendingUsers.length > 1 ? 's' : ''} awaiting approval.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | UserStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Loading users">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {statusFilter === 'all' ? 'No users found' : `No ${statusFilter} users found`}
            </p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium">{user.full_name || 'No name provided'}</h3>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail size={14} />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} />
                          <span>Registered {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                        {user.approved_at && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle size={14} />
                            <span>
                              Approved {new Date(user.approved_at).toLocaleDateString()}
                              {user.approved_profile && ` by ${user.approved_profile.full_name}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Prevent self-modification: Don't show action buttons for current user */}
                    {user.id === profile?.id ? (
                      <span className="text-sm text-gray-500 italic">
                        Current User (Cannot modify own status)
                      </span>
                    ) : (
                      <>
                        {user.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateUserStatus(user.id, 'approved')}
                              disabled={updatingUsers.has(user.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {updatingUsers.has(user.id) ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateUserStatus(user.id, 'rejected')}
                              disabled={updatingUsers.has(user.id)}
                            >
                              {updatingUsers.has(user.id) ? 'Denying...' : 'Deny'}
                            </Button>
                          </>
                        )}
                        
                        {user.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateUserStatus(user.id, 'rejected')}
                            disabled={updatingUsers.has(user.id)}
                          >
                            {updatingUsers.has(user.id) ? 'Revoking...' : 'Revoke Access'}
                          </Button>
                        )}

                        {user.status === 'rejected' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateUserStatus(user.id, 'approved')}
                            disabled={updatingUsers.has(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updatingUsers.has(user.id) ? 'Approving...' : 'Approve'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}