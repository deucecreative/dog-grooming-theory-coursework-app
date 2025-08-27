#!/usr/bin/env node
/**
 * RLS Policy Verification Script
 * MANDATORY: Run this for every table before declaring CRUD APIs complete
 * 
 * Prevents the catastrophic "Silent Deletion Failure" bug
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔒 RLS POLICY VERIFICATION')
console.log('=' .repeat(50))

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const REQUIRED_TABLES = [
  'profiles',
  'invitations', 
  'questions',
  'assignments', 
  'submissions',
  'assessments',
  'final_grades'
]

const REQUIRED_OPERATIONS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for critical tables...\n')

  let allPoliciesValid = true
  
  for (const tableName of REQUIRED_TABLES) {
    console.log(`📋 Checking table: ${tableName}`)
    
    try {
      // Query pg_policies to get all policies for this table
      const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT policyname, permissive, roles, cmd, qual 
          FROM pg_policies 
          WHERE tablename = '${tableName}' 
          ORDER BY cmd, policyname;
        `
      })
      
      if (error) {
        // Fallback: try direct query if RPC fails
        console.log(`   ⚠️  RPC failed, trying direct query...`)
        const { data: policies2, error: error2 } = await supabase
          .from('pg_policies')
          .select('policyname, cmd')
          .eq('tablename', tableName)
        
        if (error2) {
          console.log(`   ❌ Cannot query policies: ${error2.message}`)
          allPoliciesValid = false
          continue
        }
        policies = policies2
      }

      if (!policies || policies.length === 0) {
        console.log(`   ❌ NO POLICIES FOUND - RLS may not be enabled or no policies exist`)
        allPoliciesValid = false
        continue
      }

      // Check each required operation
      const foundOperations = new Set()
      policies.forEach(policy => {
        foundOperations.add(policy.cmd)
        console.log(`   ✅ ${policy.cmd}: ${policy.policyname}`)
      })

      // Check for missing operations
      const missingOps = REQUIRED_OPERATIONS.filter(op => !foundOperations.has(op))
      if (missingOps.length > 0) {
        console.log(`   ❌ MISSING POLICIES: ${missingOps.join(', ')}`)
        allPoliciesValid = false
      } else {
        console.log(`   ✅ All required operations have policies`)
      }

    } catch (err) {
      console.log(`   ❌ Error checking ${tableName}: ${err.message}`)
      allPoliciesValid = false
    }
    
    console.log() // Empty line
  }

  // Summary
  console.log('='.repeat(50))
  console.log('📊 RLS POLICY VERIFICATION SUMMARY')
  console.log()

  if (allPoliciesValid) {
    console.log('✅ ALL TABLES HAVE COMPLETE RLS POLICIES')
    console.log('   Safe to proceed with CRUD API development')
    process.exit(0)
  } else {
    console.log('❌ MISSING OR INCOMPLETE RLS POLICIES DETECTED')
    console.log()
    console.log('🚨 CRITICAL ACTIONS REQUIRED:')
    console.log('   1. Add missing RLS policies for tables shown above')
    console.log('   2. Ensure all CRUD operations (SELECT, INSERT, UPDATE, DELETE) have policies')
    console.log('   3. Test each policy with appropriate user roles')
    console.log('   4. Run this script again until all policies are complete')
    console.log()
    console.log('⚠️  DO NOT DECLARE ANY CRUD API "COMPLETE" UNTIL THIS PASSES')
    console.log()
    console.log('📖 See PROJECT.md "Silent Deletion Failure" section for full details')
    process.exit(1)
  }
}

checkRLSPolicies().catch(err => {
  console.error('❌ Script error:', err)
  process.exit(1)
})