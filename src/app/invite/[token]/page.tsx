'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '@/types/database'

interface InvitationData {
  email: string
  role: UserRole
  invited_by: string
  expires_at: string
}

export default function InviteAcceptPage() {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const token = params.token as string

  useEffect(() => {
    if (token) {
      verifyInvitation(token)
    } else {
      setError('Invitation Not Found')
      setIsLoading(false)
    }
  }, [token])

  const verifyInvitation = async (invitationToken: string) => {
    try {
      setIsLoading(true)
      setError(null)


      const response = await fetch('/api/invitations/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: invitationToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify invitation')
      }

      if (data.valid) {
        setInvitation(data.invitation)
      } else {
        setError('Invalid invitation')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify invitation'
      setError(message)
      console.error('Invitation verification error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitation) return

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      
      // Sign up the user with the pre-assigned role from invitation
      const { data, error } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: invitation.role,
            invitation_token: token, // Pass token to trigger to mark invitation as used
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Mark invitation as used
        await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (data.session) {
          // User is automatically logged in
          toast({
            title: 'Welcome!',
            description: 'Account created successfully! You are now logged in.',
          })
          router.push('/dashboard')
          router.refresh()
        } else {
          // Email confirmation required
          toast({
            title: 'Check your email',
            description: 'Account created successfully! Please check your email to verify your account.',
          })
          router.push('/login')
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during account creation.'
      
      toast({
        title: 'Account Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Verifying Invitation...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invitation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>This invitation link is invalid or has expired.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Accept Invitation</CardTitle>
          <CardDescription className="text-center">
            Complete your account setup for {invitation.email}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Input
                id="role"
                value={invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1).replace('_', ' ')}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Create a password (min. 6 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Confirm your password"
              />
            </div>
            <Alert>
              <AlertDescription>
                You have been invited by {invitation.invited_by || 'an administrator'} to join as a {invitation.role.replace('_', ' ')}.
                This invitation expires on {new Date(invitation.expires_at).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/login')}
                type="button"
              >
                Sign In
              </Button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}