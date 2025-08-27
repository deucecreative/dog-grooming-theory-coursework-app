'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail } from 'lucide-react'

export function SignUpForm() {
  const router = useRouter()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Join the Platform</CardTitle>
        <CardDescription className="text-center">
          Account creation is by invitation only
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            New accounts require an invitation from your course leader or administrator. 
            Public registration has been disabled for security reasons.
          </AlertDescription>
        </Alert>
        
        <div className="text-center space-y-2">
          <h4 className="font-semibold text-sm">Need an Account?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Students:</strong> Contact your course leader</li>
            <li>• <strong>Course Leaders:</strong> Contact your administrator</li>
            <li>• <strong>Administrators:</strong> Contact system support</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Have an invitation link?</strong><br />
            Check your email for an invitation link that starts with <code>/invite/</code>
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            try {
              router.push('/login')
            } catch (error) {
              console.error('Navigation error:', error)
            }
          }}
        >
          Back to Login
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
    </Card>
  )
}