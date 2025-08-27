'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { Trash2, RefreshCw, Copy, UserPlus, Check, X, Users } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: UserRole
  invited_by: string
  expires_at: string
  created_at: string
  used_at: string | null
  profiles?: {
    full_name: string
    email: string
  }
}

interface PendingUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  status: string
  created_at: string
  approved_by: string | null
  approved_at: string | null
  approved_profile: {
    full_name: string
    email: string
  } | null
}

export default function StudentManagementPage() {
  const { profile } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()
  
  // State for invitations
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationEmail, setInvitationEmail] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [generatedInvite, setGeneratedInvite] = useState('')
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())

  // State for pending users
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)

  // Check if user has permission (course leaders can only manage students)
  const canManageStudents = profile?.role === 'course_leader' || profile?.role === 'admin'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Inline the API calls to avoid dependency issues
      const [invitationsResponse, usersResponse] = await Promise.all([
        fetch('/api/invitations'),
        fetch('/api/users?status=pending')
      ])
      
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setPendingUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast, setInvitations, setPendingUsers])

  useEffect(() => {
    if (!profile) return
    
    if (!canManageStudents) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to manage students.',
        variant: 'destructive',
      })
      router.push('/dashboard')
      return
    }

    fetchData()
  }, [profile, canManageStudents, fetchData, toast, router])

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/invitations')
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive',
      })
    }
  }, [toast])

  const fetchPendingUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users?status=pending')
      if (!response.ok) {
        throw new Error('Failed to fetch pending users')
      }
      const data = await response.json()
      setPendingUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching pending users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitationEmail.trim() || isCreating) return

    setIsCreating(true)
    setGeneratedInvite('')

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitationEmail,
          role: 'student', // Course leaders can only invite students
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation')
      }

      toast({
        title: 'Success',
        description: 'Invitation created successfully',
      })

      setGeneratedInvite(data.inviteUrl)
      setInvitationEmail('')
      await fetchInvitations()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create invitation'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (processingInvitations.has(invitationId)) return

    setProcessingInvitations(prev => new Set(prev).add(invitationId))

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PUT'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invitation')
      }

      toast({
        title: 'Success',
        description: 'Invitation resent successfully',
      })

      setGeneratedInvite(data.inviteUrl)
      await fetchInvitations()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend invitation'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  const handleDeleteInvitation = async (invitationId: string, email: string) => {
    if (processingInvitations.has(invitationId)) return

    const confirmed = confirm(`Are you sure you want to delete the invitation for ${email}? This action cannot be undone.`)
    if (!confirmed) return

    setProcessingInvitations(prev => new Set(prev).add(invitationId))

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Notice',
            description: 'Invitation was already removed. Refreshing list...',
            variant: 'default',
          })
        } else if (response.status === 403) {
          toast({
            title: 'Permission Denied',
            description: data.error || 'You do not have permission to delete this invitation',
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || 'Failed to delete invitation')
        }
      } else {
        toast({
          title: 'Success',
          description: 'Invitation deleted successfully',
        })
      }

      await fetchInvitations()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete invitation'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  const handleApproveUser = async (userId: string, email: string) => {
    if (processingUsers.has(userId)) return

    setProcessingUsers(prev => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'approve',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve user')
      }

      toast({
        title: 'Success',
        description: `User ${email} has been approved`,
      })

      await fetchPendingUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve user'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const handleRejectUser = async (userId: string, email: string) => {
    if (processingUsers.has(userId)) return

    const reason = prompt('Please provide a reason for rejection (optional):')
    if (reason === null) return // User cancelled

    setProcessingUsers(prev => new Set(prev).add(userId))

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'reject',
          rejectionReason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject user')
      }

      toast({
        title: 'Success',
        description: `User ${email} has been rejected`,
      })

      await fetchPendingUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject user'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied',
        description: 'Invitation URL copied to clipboard',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  if (!canManageStudents) {
    return (
      <Alert>
        <AlertDescription>
          You do not have permission to access this page.
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Student Management</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Student Management</h1>
      </div>

      <Tabs defaultValue="invitations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invitations">
            Send Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval ({pendingUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Invite New Student</span>
              </CardTitle>
              <CardDescription>
                Send an invitation to a new student to join the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Student Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    value={invitationEmail}
                    onChange={(e) => setInvitationEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Invitation'}
                </Button>
              </form>

              {generatedInvite && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Invitation created successfully!</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                          {generatedInvite}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(generatedInvite)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that have been sent but not yet used
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No pending invitations
                </p>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Role: {invitation.role}</span>
                          <span>
                            Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                          <span>
                            Invited by: {invitation.profiles?.full_name || invitation.profiles?.email || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvitation(invitation.id)}
                          disabled={processingInvitations.has(invitation.id)}
                        >
                          <RefreshCw className={`h-4 w-4 ${processingInvitations.has(invitation.id) ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                          disabled={processingInvitations.has(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users Pending Approval</CardTitle>
              <CardDescription>
                Students who have registered and are awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No users pending approval
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <Badge variant="secondary">{user.role}</Badge>
                          <Badge variant="outline">{user.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          Registered: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user.id, user.email)}
                          disabled={processingUsers.has(user.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectUser(user.id, user.email)}
                          disabled={processingUsers.has(user.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}