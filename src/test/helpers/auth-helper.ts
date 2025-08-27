import { createClient } from '@supabase/supabase-js'

/**
 * E2E Authentication Helper
 * Provides authenticated session management for E2E tests
 */

const TEST_ADMIN_EMAIL = 'e2e-admin@example.com'
const TEST_ADMIN_PASSWORD = 'e2e-test-password-123!'

// Generate unique storage keys for E2E auth clients with maximum uniqueness
const e2eAuthId = `e2e-auth-${Date.now()}-${performance.now()}-${process.pid}-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`

// Create client for auth operations with unique storage key
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `${e2eAuthId}-auth`,
      flowType: 'pkce'
    }
  }
)

// Service role client for setup operations with unique storage key
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `${e2eAuthId}-service`,
      flowType: 'pkce'
    }
  }
)

export interface E2EAuthSession {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
}

/**
 * Setup E2E admin user for testing
 * Creates or ensures test admin user exists
 */
export async function setupE2EAdminUser(): Promise<void> {
  // Check if test admin already exists
  const { data: existingProfile } = await supabaseService
    .from('profiles')
    .select('id, email')
    .eq('email', TEST_ADMIN_EMAIL)
    .single()

  if (existingProfile) {
    console.log('E2E admin user already exists')
    return
  }

  // Check if auth user exists but profile doesn't
  const { data: authUsers } = await supabaseService.auth.admin.listUsers()
  const existingAuthUser = authUsers.users.find(u => u.email === TEST_ADMIN_EMAIL)

  let userId: string

  if (existingAuthUser) {
    console.log('E2E admin auth user exists, creating profile')
    userId = existingAuthUser.id
  } else {
    // Create auth user
    const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E Test Admin'
      }
    })

    if (authError) {
      throw new Error(`Failed to create E2E admin auth user: ${authError.message}`)
    }

    userId = authUser.user.id
  }

  // Create profile with admin role (upsert to handle any conflicts)
  const { error: profileError } = await supabaseService
    .from('profiles')
    .upsert({
      id: userId,
      email: TEST_ADMIN_EMAIL,
      full_name: 'E2E Test Admin',
      role: 'admin',
      status: 'approved'
    })

  if (profileError) {
    throw new Error(`Failed to create E2E admin profile: ${profileError.message}`)
  }

  console.log('E2E admin user ready')
}

/**
 * Authenticate as E2E admin user
 */
export async function authenticateAsAdmin(): Promise<E2EAuthSession> {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD
  })

  if (error || !data.session) {
    throw new Error(`Failed to authenticate E2E admin: ${error?.message}`)
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.user.id,
    email: data.user.email!
  }
}

/**
 * Make authenticated API request using proper Supabase SSR cookies
 */
export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit,
  session: E2EAuthSession
): Promise<Response> {
  // Create proper Supabase SSR cookies using the exact format from debugging
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]
  
  // Build session data exactly as Supabase does it
  const sessionData = {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: session.userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: session.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { 
        provider: 'email', 
        providers: ['email'] 
      },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Base64 encode with the base64- prefix as seen in debug output
  const sessionJson = JSON.stringify(sessionData)
  const sessionBase64 = Buffer.from(sessionJson).toString('base64')
  const cookieValue = `base64-${sessionBase64}`

  const cookieName = `sb-${projectRef}-auth-token`
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Cookie': `${cookieName}=${cookieValue}`
  }

  return fetch(url, {
    ...options,
    headers
  })
}

/**
 * Cleanup E2E admin session
 */
export async function cleanupE2ESession(): Promise<void> {
  await supabaseAuth.auth.signOut()
}

/**
 * Remove E2E admin user (for cleanup)
 */
export async function removeE2EAdminUser(): Promise<void> {
  const { data: profile } = await supabaseService
    .from('profiles')
    .select('id')
    .eq('email', TEST_ADMIN_EMAIL)
    .single()

  if (profile) {
    await supabaseService.auth.admin.deleteUser(profile.id)
    console.log('E2E admin user removed')
  }
}