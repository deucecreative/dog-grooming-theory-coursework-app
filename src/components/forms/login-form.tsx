'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        toast({
          title: 'Success',
          description: 'You have been logged in successfully.',
        })
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login.'
      
      // Handle specific error cases with user-friendly messages
      let userMessage = errorMessage
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        userMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        userMessage = 'Please check your email and confirm your account before logging in.'
      } else if (errorMessage.toLowerCase().includes('access denied') || errorMessage.toLowerCase().includes('not authorized')) {
        userMessage = 'Your account is pending approval from a course leader. Please wait for approval before logging in.'
      } else if (errorMessage.toLowerCase().includes('too many requests')) {
        userMessage = 'Too many login attempts. Please wait a moment and try again.'
      }
      
      toast({
        title: 'Login Failed',
        description: userMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your coursework
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="your.email@example.com"
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
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push('/signup')}
              type="button"
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}