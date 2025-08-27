#!/usr/bin/env node
/**
 * CRUD Operations Verification Script
 * MANDATORY: Run this to verify all CRUD operations actually work against database
 * 
 * This prevents "Silent Failure" bugs where APIs return success but don't modify data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import crypto from 'crypto'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 CRUD OPERATIONS VERIFICATION')
console.log('=' .repeat(50))

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing database credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInvitationsCRUD() {
  console.log('🧪 Testing invitations table CRUD operations...')
  
  const testEmail = `test-${crypto.randomUUID()}@example.com`
  let createdId = null
  
  try {
    // Test CREATE
    console.log('   ⏳ Testing CREATE...')
    const { data: created, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: testEmail,
        role: 'student',
        invited_by: '00000000-0000-0000-0000-000000000000', // Fake admin ID for test
        expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()
      })
      .select()
      .single()
    
    if (createError) {
      console.log(`   ❌ CREATE failed: ${createError.message}`)
      return false
    }
    
    if (!created) {
      console.log(`   ❌ CREATE returned null - possible RLS policy issue`)
      return false
    }
    
    createdId = created.id
    console.log(`   ✅ CREATE successful: ${createdId}`)
    
    // Test READ
    console.log('   ⏳ Testing READ...')
    const { data: read, error: readError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', createdId)
      .single()
    
    if (readError) {
      console.log(`   ❌ READ failed: ${readError.message}`)
      return false
    }
    
    if (!read || read.email !== testEmail) {
      console.log(`   ❌ READ returned wrong data`)
      return false
    }
    
    console.log(`   ✅ READ successful`)
    
    // Test UPDATE
    console.log('   ⏳ Testing UPDATE...')
    const newEmail = `updated-${crypto.randomUUID()}@example.com`
    const { data: updated, error: updateError } = await supabase
      .from('invitations')
      .update({ email: newEmail })
      .eq('id', createdId)
      .select()
      .single()
    
    if (updateError) {
      console.log(`   ❌ UPDATE failed: ${updateError.message}`)
      return false
    }
    
    if (!updated || updated.email !== newEmail) {
      console.log(`   ❌ UPDATE didn't change data - possible RLS policy issue`)
      return false
    }
    
    console.log(`   ✅ UPDATE successful`)
    
    // Test DELETE - THE CRITICAL TEST
    console.log('   ⏳ Testing DELETE (CRITICAL)...')
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', createdId)
      .select() // CRITICAL: Must use .select() to verify deletion
    
    if (deleteError) {
      console.log(`   ❌ DELETE failed: ${deleteError.message}`)
      return false
    }
    
    // CRITICAL CHECK: Verify rows were actually deleted
    if (!deletedRows || deletedRows.length === 0) {
      console.log(`   ❌ DELETE SILENT FAILURE - No rows affected!`)
      console.log(`   🚨 This is the exact bug that caused the catastrophic failure`)
      console.log(`   🚨 Missing DELETE policy in RLS - check pg_policies`)
      return false
    }
    
    console.log(`   ✅ DELETE successful - ${deletedRows.length} row(s) deleted`)
    
    // Verify record is actually gone from database
    const { data: shouldBeNull, error: verifyError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', createdId)
      .maybeSingle()
    
    if (verifyError) {
      console.log(`   ❌ DELETE verification failed: ${verifyError.message}`)
      return false
    }
    
    if (shouldBeNull !== null) {
      console.log(`   ❌ DELETE verification failed - record still exists!`)
      console.log(`   🚨 Catastrophic bug: API claimed success but record persists`)
      return false
    }
    
    console.log(`   ✅ DELETE verification successful - record actually removed`)
    createdId = null // Prevent cleanup attempt
    
    return true
    
  } catch (error) {
    console.log(`   ❌ Test error: ${error.message}`)
    return false
  } finally {
    // Cleanup any test records that weren't deleted
    if (createdId) {
      console.log('   🧹 Cleaning up test record...')
      try {
        await supabase.from('invitations').delete().eq('id', createdId)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function runAllTests() {
  const results = []
  
  // Test invitations table (the one that had the catastrophic failure)
  results.push({
    table: 'invitations',
    success: await testInvitationsCRUD()
  })
  
  // Future: Add tests for other critical tables
  // results.push({ table: 'questions', success: await testQuestionsCRUD() })
  // results.push({ table: 'assignments', success: await testAssignmentsCRUD() })
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 CRUD VERIFICATION SUMMARY')
  console.log()
  
  let allPassed = true
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.table} table`)
    if (!result.success) allPassed = false
  })
  
  console.log()
  
  if (allPassed) {
    console.log('✅ ALL CRUD OPERATIONS WORKING CORRECTLY')
    console.log('   Safe to proceed with API development')
    process.exit(0)
  } else {
    console.log('❌ CRUD OPERATION FAILURES DETECTED')
    console.log()
    console.log('🚨 CRITICAL ACTIONS REQUIRED:')
    console.log('   1. Check RLS policies with: node scripts/verify-rls-policies.js')
    console.log('   2. Add missing DELETE policies for failed tables')
    console.log('   3. Verify API implementation uses .select() on DELETE/UPDATE')
    console.log('   4. Run integration tests that verify actual data changes')
    console.log()
    console.log('⚠️  DO NOT DEPLOY UNTIL ALL CRUD OPERATIONS PASS')
    process.exit(1)
  }
}

runAllTests().catch(err => {
  console.error('❌ Verification script error:', err)
  process.exit(1)
})