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

// Validation schema for accepting invitations
const acceptInvitationSchema = z.object({
  token: z.string().min(1),
})

// POST /api/invitations/accept - Mark invitation as used
export async function POST(request: NextRequest) {
  try {
    // Use service client for invitation operations (bypasses RLS)
    const supabase = createServiceAuthClient()

    // Parse and validate request body
    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid token format', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { token } = validation.data

    // Mark invitation as used
    const { data: invitation, error } = await supabase
      .from('invitations')
      .update({ 
        used_at: new Date().toISOString() 
      })
      .eq('token', token)
      .is('used_at', null) // Only update if not already used
      .select('id, email')
      .single()

    if (error) {
      console.error('Error accepting invitation:', error)
      return NextResponse.json({ 
        error: 'Failed to accept invitation' 
      }, { status: 500 })
    }

    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invitation not found or already used' 
      }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      invitation_id: invitation.id
    })

  } catch (error) {
    console.error('Invitation acceptance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}