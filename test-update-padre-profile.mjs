import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file manually
const env = readFileSync('.env', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function testUpdateProfile() {
  try {
    console.log('=== Test: Update Padre Profile with Authentication ===\n');

    // Test with a known user that has auth account
    const testEmail = 'antoniogamez@gmail.com';
    const testPassword = 'Test1234!'; // You'll need the actual password

    console.log('Step 1: Signing in as test user...');
    console.log(`NOTE: Testing with ${testEmail} (anon client - NOT authenticated)`);
    console.log('This simulates the UNAUTHENTICATED scenario\n');

    // Load padre data WITHOUT authentication (as anon user)
    const { data: padreData, error: loadError } = await supabase
      .from('padres')
      .select('*')
      .eq('email', testEmail)
      .maybeSingle();

    if (loadError) {
      console.error('Error loading padre data:', loadError);
      return;
    }

    if (!padreData) {
      console.log('No padre found with that email');
      return;
    }

    console.log('Padre data loaded (using anon key):', {
      id: padreData.id,
      email: padreData.email,
      nombre: padreData.nombre,
      user_id: padreData.user_id
    });

    // Try to update WITHOUT being authenticated
    const newEmail = `test_${Date.now()}@example.com`;
    console.log(`\nStep 2: Attempting to UPDATE as UNAUTHENTICATED user...`);
    console.log(`Trying to change email to: ${newEmail}`);

    const { data: updateData, error: updateError } = await supabase
      .from('padres')
      .update({
        nombre: padreData.nombre,
        email: newEmail,
        telefono: padreData.telefono
      })
      .eq('id', padreData.id)
      .select();

    if (updateError) {
      console.error('\n❌ UPDATE FAILED (as expected for unauth user):');
      console.error('Error code:', updateError.code);
      console.error('Error message:', updateError.message);
      console.error('Error details:', updateError.details);
      console.error('Error hint:', updateError.hint);
    } else {
      console.log('\n✅ UPDATE SUCCEEDED (unexpected!):');
      console.log('Updated data:', updateData);
    }

    console.log('\n\n=== Now testing with AUTHENTICATED user ===\n');

    console.log('IMPORTANT: Cannot test authenticated scenario without password.');
    console.log('The user must be experiencing the RLS error when AUTHENTICATED.');
    console.log('\nLet me check the RLS policies more carefully...');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testUpdateProfile();
