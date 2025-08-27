#!/usr/bin/env node
/**
 * Schema Validation Script
 * MANDATORY: Run this before any database-related development
 * 
 * This script prevents the enum mismatch issue that caused production bugs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 SCHEMA COMPATIBILITY VALIDATION')
console.log('=' .repeat(50))

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Read TypeScript database types
const typesPath = resolve(process.cwd(), 'src/types/database.ts')
const typesContent = readFileSync(typesPath, 'utf-8')

// Extract enum definitions from TypeScript
function extractTSEnum(enumName) {
  const regex = new RegExp(`export type ${enumName} = ([^\\n]+)`)
  const match = typesContent.match(regex)
  if (!match) return null
  
  // Extract values from 'value1' | 'value2' | 'value3' format
  const values = match[1].match(/'([^']+)'/g)?.map(v => v.replace(/'/g, '')) || []
  return values
}

async function validateEnum(enumName, tsValues) {
  console.log(`\n📋 Validating ${enumName}:`)
  console.log(`   TypeScript: [${tsValues.join(', ')}]`)
  
  const results = []
  
  for (const value of tsValues) {
    try {
      // Test if database accepts this enum value
      const { error } = await supabase
        .from('profiles') // Assuming profiles table uses these enums
        .select('id')
        .eq('status', value) // This will fail if enum value is invalid
        .limit(0)
      
      if (error && error.message.includes('invalid input value for enum')) {
        console.log(`   ❌ '${value}' - INVALID in database`)
        results.push({ value, valid: false, error: error.message })
      } else {
        console.log(`   ✅ '${value}' - Valid`)
        results.push({ value, valid: true })
      }
    } catch (err) {
      console.log(`   ❌ '${value}' - ERROR: ${err.message}`)
      results.push({ value, valid: false, error: err.message })
    }
  }
  
  return results
}

async function main() {
  console.log('🔧 Checking database connection...')
  
  try {
    const { error } = await supabase.from('profiles').select('id').limit(0)
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      process.exit(1)
    }
    console.log('✅ Database connection successful')
  } catch (err) {
    console.error('❌ Database connection error:', err.message)
    process.exit(1)
  }
  
  // Validate critical enums
  const userStatusValues = extractTSEnum('UserStatus')
  const userRoleValues = extractTSEnum('UserRole')
  
  if (!userStatusValues || !userRoleValues) {
    console.error('❌ Could not extract enum values from TypeScript types')
    console.error('   Check src/types/database.ts format')
    process.exit(1)
  }
  
  // Validate UserStatus enum
  const statusResults = await validateEnum('UserStatus', userStatusValues)
  
  // Validate UserRole enum (test on profiles table role column)
  console.log(`\n📋 Validating UserRole:`)
  console.log(`   TypeScript: [${userRoleValues.join(', ')}]`)
  
  const roleResults = []
  for (const value of userRoleValues) {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', value)
        .limit(0)
      
      if (error && error.message.includes('invalid input value for enum')) {
        console.log(`   ❌ '${value}' - INVALID in database`)
        roleResults.push({ value, valid: false, error: error.message })
      } else {
        console.log(`   ✅ '${value}' - Valid`)
        roleResults.push({ value, valid: true })
      }
    } catch (err) {
      console.log(`   ❌ '${value}' - ERROR: ${err.message}`)
      roleResults.push({ value, valid: false, error: err.message })
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 VALIDATION SUMMARY')
  
  const statusInvalid = statusResults.filter(r => !r.valid)
  const roleInvalid = roleResults.filter(r => !r.valid)
  
  if (statusInvalid.length === 0 && roleInvalid.length === 0) {
    console.log('✅ ALL ENUM VALUES VALID')
    console.log('   Safe to proceed with development')
    process.exit(0)
  } else {
    console.log('❌ SCHEMA MISMATCH DETECTED')
    
    if (statusInvalid.length > 0) {
      console.log(`   UserStatus issues: ${statusInvalid.map(r => r.value).join(', ')}`)
    }
    
    if (roleInvalid.length > 0) {
      console.log(`   UserRole issues: ${roleInvalid.map(r => r.value).join(', ')}`)
    }
    
    console.log('\n🔧 REQUIRED ACTIONS:')
    console.log('   1. Check database migration files in supabase/migrations/')
    console.log('   2. Update TypeScript types in src/types/database.ts')
    console.log('   3. OR create database migration to add missing enum values')
    console.log('   4. Run this script again until all values are valid')
    
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Validation script error:', err)
  process.exit(1)
})