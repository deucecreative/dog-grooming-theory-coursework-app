'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Shield } from 'lucide-react'

export default function BootstrapPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasAdmins, setHasAdmins] = useState(false)
  const [checkingAdmins, setCheckingAdmins] = useState(true)
  
  const { supabase } = useSupabase()
  const { toast } = useToast()

  const checkForExistingAdmins = useCallback(async () => {
    try {
      setCheckingAdmins(true)
      
      // Check if any admin accounts exist
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)

      if (error) {
        console.error('Error checking for admins:', error)
        return
      }

      setHasAdmins(data && data.length > 0)
    } catch (error) {
      console.error('Error checking for admins:', error)
    } finally {
      setCheckingAdmins(false)
    }
  }, [supabase])

  useEffect(() => {
    checkForExistingAdmins()
  }, [checkForExistingAdmins])

  const handleBootstrapAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!adminEmail || !adminPassword || !adminFullName) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // Create the admin account
      const { data, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminFullName,
            role: 'admin', // This will be set by the trigger
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Update the profile to admin role and approved status
        // This needs to be done with elevated permissions
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            status: 'approved',
            approved_by: data.user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', data.user.id)

        if (updateError) {
          console.error('Failed to update profile to admin:', updateError)
          toast({
            title: 'Partial Success',
            description: 'Account created but role update failed. Please update manually in database.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Success',
            description: 'Admin account created successfully! Please sign in.',
          })
          
          // Clear form
          setAdminEmail('')
          setAdminPassword('')
          setAdminFullName('')
          
          // Refresh admin check
          await checkForExistingAdmins()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin account'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Checking System Status...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (hasAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>System Secured</span>
            </CardTitle>
            <CardDescription className="text-center">
              Admin accounts already exist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                The platform already has administrator accounts configured. 
                Bootstrap mode is disabled for security.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Bootstrap Admin</span>
          </CardTitle>
          <CardDescription className="text-center">
            Create the first administrator account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> This page is only available when no admin accounts exist. 
              It will be automatically disabled after the first admin is created.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleBootstrapAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={adminFullName}
                onChange={(e) => setAdminFullName(e.target.value)}
                placeholder="Administrator Name"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yourschool.edu"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>

            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Use your institutional email address and a strong password. 
                This account will have full administrative privileges.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}