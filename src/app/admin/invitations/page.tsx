'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { Trash2, RefreshCw } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: UserRole
  expires_at: string
  used_at: string | null
  created_at: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function InvitationsPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [isLoading, setIsLoading] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null)
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())
  
  const { profile } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

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

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    
    if (profile) {
      fetchInvitations()
    }
  }, [profile, router, fetchInvitations])

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation')
      }

      toast({
        title: 'Success',
        description: 'Invitation created successfully',
      })

      // Generate invitation URL for testing
      const inviteUrl = `${window.location.origin}/invite/${data.invitation.token}`
      setGeneratedInvite(inviteUrl)

      setEmail('')
      setRole('student')
      
      // Refresh invitations list
      await fetchInvitations()
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create invitation'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteUrl = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite)
      toast({
        title: 'Copied',
        description: 'Invitation link copied to clipboard',
      })
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

      // Show the new invitation URL
      setGeneratedInvite(data.inviteUrl)

      // Refresh invitations list
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

    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete the invitation for ${email}? This action cannot be undone.`)
    if (!confirmed) return

    setProcessingInvitations(prev => new Set(prev).add(invitationId))

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle different error types appropriately
        if (response.status === 404) {
          // Invitation no longer exists - this is actually success from UI perspective
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

      // Always refresh the invitations list to sync with database state
      await fetchInvitations()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete invitation'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
      
      // Still refresh on error to ensure UI is in sync with database
      await fetchInvitations()
    } finally {
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(invitationId)
        return newSet
      })
    }
  }

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (invitation.used_at) {
      return <Badge variant="secondary">Used</Badge>
    } else if (now > expiresAt) {
      return <Badge variant="destructive">Expired</Badge>
    } else {
      return <Badge variant="default">Active</Badge>
    }
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. This page is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invitation Management</h1>
        <p className="text-gray-600">Create and manage user invitations</p>
      </div>

      {generatedInvite && (
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Invitation created!</strong> Share this link with the user:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                  {generatedInvite}
                </code>
                <Button variant="outline" size="sm" onClick={copyInviteUrl}>
                  Copy
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setGeneratedInvite(null)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Invitation</CardTitle>
          <CardDescription>
            Send an invitation to a new user to join the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="course_leader">Course Leader</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invitations</CardTitle>
          <CardDescription>
            View and manage existing invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-gray-500">No invitations found</p>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => {
                const now = new Date()
                const expiresAt = new Date(invitation.expires_at)
                const isExpired = now > expiresAt
                const isUsed = !!invitation.used_at
                const canResend = !isUsed
                const canDelete = !isUsed
                const isProcessing = processingInvitations.has(invitation.id)

                return (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium">{invitation.email}</p>
                        {getStatusBadge(invitation)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1).replace('_', ' ')} • 
                        Invited by {invitation.profiles?.full_name} • 
                        {isExpired ? 'Expired' : 'Expires'} {expiresAt.toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canResend && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvitation(invitation.id)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1"
                        >
                          <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                          <span>{isProcessing ? 'Resending...' : 'Resend'}</span>
                        </Button>
                      )}
                      
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInvitation(invitation.id, invitation.email)}
                          disabled={isProcessing}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          <span>{isProcessing ? 'Deleting...' : 'Delete'}</span>
                        </Button>
                      )}

                      {isUsed && invitation.used_at && (
                        <span className="text-sm text-gray-500 italic">
                          Used on {new Date(invitation.used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}