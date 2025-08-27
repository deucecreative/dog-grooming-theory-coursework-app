import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// DELETE /api/invitations/[id] - Delete an invitation
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('DELETE Auth failed:', authError?.message || 'No user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('DELETE request - Authenticated user:', user.id, user.email)

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    console.log('DELETE request - User profile:', profile)

    if (!profile || !['admin', 'course_leader'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the invitation to check ownership and usage
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, invited_by, used_at')
      .eq('id', id)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user can delete this invitation
    // Admins can delete any invitation, course_leaders can only delete their own
    if (profile.role === 'course_leader' && invitation.invited_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this invitation' }, { status: 403 })
    }

    // Prevent deletion of used invitations
    if (invitation.used_at) {
      return NextResponse.json({ error: 'Cannot delete used invitation' }, { status: 400 })
    }

    // Delete the invitation and verify it was actually deleted
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)
      .select() // Return deleted rows to verify operation succeeded

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 })
    }

    // Check if any rows were actually deleted (catches RLS policy failures)
    if (!deletedRows || deletedRows.length === 0) {
      console.error('Silent deletion failure - no rows affected. Possible RLS policy issue.')
      console.error('User:', user.id, user.email)
      console.error('Profile:', profile)
      console.error('Invitation ID:', id)
      
      // Since we already verified the invitation exists (line 35), 
      // if deletion fails it's a permission/RLS issue, not "not found"
      return NextResponse.json({ 
        error: 'Unable to delete invitation - insufficient permissions or RLS policy restriction' 
      }, { status: 403 })
    }

    return NextResponse.json({ message: 'Invitation deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/invitations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/invitations/[id] - Resend invitation (generate new token and extend expiration)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
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

    // Get the invitation to check ownership and usage
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('id, invited_by, used_at, email, role')
      .eq('id', id)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user can resend this invitation
    // Admins can resend any invitation, course_leaders can only resend their own
    if (profile.role === 'course_leader' && invitation.invited_by !== user.id) {
      return NextResponse.json({ error: 'Not authorized to resend this invitation' }, { status: 403 })
    }

    // Prevent resending of used invitations
    if (invitation.used_at) {
      return NextResponse.json({ error: 'Cannot resend used invitation' }, { status: 400 })
    }

    // Generate new token and expiration
    const newToken = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Extend by 7 days

    // Update the invitation with new token and expiration
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        expires_at: expiresAt.toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 })
    }

    // Generate the new invitation URL
    const baseUrl = request.nextUrl.origin
    const inviteUrl = `${baseUrl}/invite/${newToken}`

    return NextResponse.json({
      invitation: updatedInvitation,
      inviteUrl
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/invitations/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}