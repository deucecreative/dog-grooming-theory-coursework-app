require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkUserProfiles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    console.log('Fetching all user profiles...\n');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in database.');
      return;
    }
    
    profiles.forEach(profile => {
      console.log(`User: ${profile.email}`);
      console.log(`  Role: ${profile.role}`);
      console.log(`  Status: ${profile.status}`);
      console.log(`  Created: ${new Date(profile.created_at).toLocaleString()}`);
      console.log(`  ID: ${profile.id}`);
      console.log('---');
    });
    
    // Get auth users for comparison
    console.log('\nChecking auth.users table...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      console.log(`Found ${users.length} auth users:`);
      users.forEach(user => {
        console.log(`  ${user.email} - ID: ${user.id}`);
      });
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkUserProfiles();