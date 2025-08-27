import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

// Validation schema for creating invitations
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['student', 'course_leader', 'admin'] as const),
})

// GET /api/invitations - List invitations (admin/course_leader only)
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'course_leader'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch invitations based on role
    let query = supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        used_at,
        created_at,
        invited_by,
        profiles!invitations_invited_by_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    // Course leaders can only see student invitations they created
    if (profile.role === 'course_leader') {
      query = query.or(`invited_by.eq.${user.id},role.eq.student`)
    }

    const { data: invitations, error } = await query

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Invitations GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'course_leader'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createInvitationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { email, role } = validation.data

    // Course leaders can only invite students
    if (profile.role === 'course_leader' && role !== 'student') {
      return NextResponse.json({ 
        error: 'Course leaders can only invite students' 
      }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 })
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'Pending invitation already exists for this email' 
      }, { status: 400 })
    }

    // Generate URL-safe token
    const token = crypto.randomBytes(32).toString('base64url')
    
    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        invited_by: user.id,
        token,
      })
      .select('id, token, email, role, expires_at')
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // TODO: Send invitation email here
    // For now, we'll return the token for testing
    
    return NextResponse.json({ 
      message: 'Invitation created successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        // Include token for testing - remove in production
        token: invitation.token
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Invitations POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}