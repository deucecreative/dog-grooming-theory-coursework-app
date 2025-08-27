const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupDatabase() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection first
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0)
    
    if (healthError && healthError.message.includes('relation "public.profiles" does not exist')) {
      console.log('Profiles table does not exist yet - this is expected for initial setup')
      console.log('You will need to apply the migrations manually in your Supabase dashboard')
      
      // Read and display the migration files
      const migrationsDir = path.join(__dirname, '../supabase/migrations')
      const migrationFiles = fs.readdirSync(migrationsDir).sort()
      
      console.log('\n=== Database Migrations to Apply ===')
      migrationFiles.forEach(file => {
        console.log(`\n--- ${file} ---`)
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        console.log(content)
      })
      
      console.log('\n=== Instructions ===')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Navigate to SQL Editor') 
      console.log('3. Execute the SQL statements above in order')
      console.log('4. Then restart this script to verify the setup')
      
    } else {
      console.log('✅ Database connection successful!')
      console.log('✅ Profiles table exists')
    }
    
  } catch (err) {
    console.error('Error setting up database:', err)
  }
}

setupDatabase()