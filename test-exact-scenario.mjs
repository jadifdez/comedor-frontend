import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const env = readFileSync('.env', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

// Create authenticated client
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function testRealScenario() {
  console.log('=== Testing EXACT scenario from frontend ===\n');

  try {
    // Use a test user that exists
    const testEmail = 'antoniogamez@gmail.com';
    const testPassword = 'Familia2024!'; // Replace with actual password if you know it

    console.log('Step 1: Sign in as test user');
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('Cannot sign in:', signInError.message);
      console.log('\nLet me check the policies directly using service role...');
      return;
    }

    console.log('✓ Signed in successfully as:', authData.user.email);
    console.log('  User ID:', authData.user.id);

    // Step 2: Load padre data
    console.log('\nStep 2: Load padre data');
    const { data: padreData, error: loadError } = await supabase
      .from('padres')
      .select('*')
      .eq('email', authData.user.email)
      .maybeSingle();

    if (loadError) {
      console.error('Error loading padre:', loadError);
      return;
    }

    console.log('✓ Padre loaded:', {
      id: padreData.id,
      email: padreData.email,
      nombre: padreData.nombre,
      user_id: padreData.user_id
    });

    // Step 3: Try to update user_id if null
    if (!padreData.user_id) {
      console.log('\nStep 3: Updating user_id (currently NULL)...');
      const { error: userIdError } = await supabase
        .from('padres')
        .update({ user_id: authData.user.id })
        .eq('id', padreData.id);

      if (userIdError) {
        console.error('❌ FAILED to update user_id:');
        console.error('  Code:', userIdError.code);
        console.error('  Message:', userIdError.message);
        console.error('  Details:', userIdError.details);
      } else {
        console.log('✓ user_id updated successfully');
        padreData.user_id = authData.user.id;
      }
    } else {
      console.log('\nStep 3: user_id already set:', padreData.user_id);
    }

    // Step 4: Try to change email (the problematic update)
    const newEmail = `test_${Date.now()}@example.com`;
    console.log(`\nStep 4: Attempting to change email to ${newEmail}...`);

    const { data: updateResult, error: updateError } = await supabase
      .from('padres')
      .update({
        nombre: padreData.nombre,
        email: newEmail,
        telefono: padreData.telefono
      })
      .eq('id', padreData.id)
      .select();

    if (updateError) {
      console.error('\n❌ UPDATE FAILED - THIS IS THE ERROR:');
      console.error('  Code:', updateError.code);
      console.error('  Message:', updateError.message);
      console.error('  Details:', updateError.details);
      console.error('  Hint:', updateError.hint);

      console.log('\n=== This is the exact error the user is experiencing ===');
    } else {
      console.log('\n✅ UPDATE SUCCEEDED:');
      console.log('  Rows affected:', updateResult?.length || 0);
      console.log('  New data:', updateResult);

      // Rollback
      console.log('\nRolling back the test change...');
      await supabase
        .from('padres')
        .update({ email: testEmail })
        .eq('id', padreData.id);
      console.log('✓ Rolled back');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testRealScenario();
