#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 RLS POLICIES CHECK')
console.log('=' .repeat(40))

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('Checking RLS policies for invitations table...')
console.log()

// Query RLS policies
const { data: policies, error } = await supabase
  .from('pg_policies')
  .select('*')
  .eq('tablename', 'invitations')

if (error) {
  console.log('❌ Error fetching policies:', error.message)
} else if (!policies || policies.length === 0) {
  console.log('❌ No RLS policies found for invitations table!')
} else {
  console.log(`✅ Found ${policies.length} RLS policies:`)
  console.log()
  
  policies.forEach((policy, index) => {
    console.log(`${index + 1}. Policy: ${policy.policyname}`)
    console.log(`   Command: ${policy.cmd}`)
    console.log(`   Roles: ${policy.roles}`)
    console.log(`   Qual: ${policy.qual || 'None'}`)
    console.log(`   With Check: ${policy.with_check || 'None'}`)
    console.log()
  })
}

console.log('Checking table structure...')
const { data: tableInfo, error: tableError } = await supabase
  .from('information_schema.tables')
  .select('*')
  .eq('table_name', 'invitations')
  .eq('table_schema', 'public')

if (tableError) {
  console.log('❌ Error fetching table info:', tableError.message)
} else if (!tableInfo || tableInfo.length === 0) {
  console.log('❌ Invitations table not found!')
} else {
  console.log('✅ Invitations table exists')
}