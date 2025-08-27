import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Create service client for database operations that bypass RLS
const createServiceAuthClient = () => {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Validation schema for verifying invitations
const verifyInvitationSchema = z.object({
  token: z.string().min(1),
})

// POST /api/invitations/verify - Verify invitation token
export async function POST(request: NextRequest) {
  try {
    // Use service client for invitation lookup (bypasses RLS)
    const supabase = createServiceAuthClient()

    // Parse and validate request body
    const body = await request.json()
    const validation = verifyInvitationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid token format', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { token } = validation.data

    // Look up invitation by token
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        used_at,
        invited_by,
        profiles!invitations_invited_by_fkey(full_name, email)
      `)
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid invitation token' 
      }, { status: 404 })
    }

    // Check if invitation has already been used
    if (invitation.used_at) {
      return NextResponse.json({ 
        error: 'This invitation has already been used' 
      }, { status: 400 })
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 })
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invitation.email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'An account with this email already exists' 
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        invited_by: invitation.profiles?.[0]?.full_name || invitation.profiles?.[0]?.email || 'an administrator',
        expires_at: invitation.expires_at,
      }
    })

  } catch (error) {
    console.error('Invitation verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}