/**
 * Script to check the actual database schema and enum values
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n')

  // Query the profiles table to understand the structure and values
  console.log('1. Checking profiles table structure...')
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)

    if (error) {
      console.log('❌ Schema query error:', error)
    } else {
      console.log('✅ Profiles table structure:')
      if (data.length > 0) {
        console.log('   Sample row:', JSON.stringify(data[0], null, 2))
        
        // Show unique status values
        const uniqueStatuses = [...new Set(data.map(row => row.status))]
        console.log('   Found status values:', uniqueStatuses)
      } else {
        console.log('   No data in profiles table')
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
  }

  // Try different status values to understand what's valid
  console.log('\n2. Testing different status values...')
  const testStatuses = ['pending', 'approved', 'denied', 'rejected', 'active', 'inactive']
  
  for (const status of testStatuses) {
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', status)
        .limit(0)

      if (error) {
        console.log(`❌ Status "${status}": ${error.message}`)
      } else {
        console.log(`✅ Status "${status}": Valid`)
      }
    } catch (err) {
      console.log(`❌ Status "${status}": ${err.message}`)
    }
  }

  // Check what enum values exist in the database
  console.log('\n3. Querying information schema for enums...')
  try {
    const { data, error } = await supabase.rpc('get_enum_values')
    if (!error && data) {
      console.log('✅ Enum values:', data)
    } else {
      console.log('❌ Could not query enum values directly')
    }
  } catch (err) {
    console.log('ℹ️  Direct enum query not available')
  }

  console.log('\n🏁 Schema check complete!')
}

checkDatabaseSchema().catch(console.error)