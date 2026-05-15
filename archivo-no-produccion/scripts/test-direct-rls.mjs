import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectUpdate() {
  console.log('=== Testing DIRECT UPDATE with SERVICE ROLE ===\n');

  try {
    const { data: padres } = await supabaseAdmin
      .from('padres')
      .select('*')
      .not('user_id', 'is', null)
      .limit(1);

    if (!padres || padres.length === 0) {
      console.log('No padres found');
      return;
    }

    const padre = padres[0];
    console.log('Testing with:', padre.email);

    const testEmail = `test_${Date.now()}@example.com`;
    console.log('Changing email to:', testEmail);
    
    const { data: r2, error: e2 } = await supabaseAdmin
      .from('padres')
      .update({
        email: testEmail
      })
      .eq('id', padre.id)
      .select();

    if (e2) {
      console.log('\n❌ FAILED WITH SERVICE ROLE:');
      console.log('Message:', e2.message);
      console.log('Code:', e2.code);
      console.log('Details:', e2.details);
      console.log('\nThis means the problem is NOT RLS - it\'s something else!');
    } else {
      console.log('\n✓ SUCCESS with service role');
      console.log('Reverting...');
      await supabaseAdmin
        .from('padres')
        .update({ email: padre.email })
        .eq('id', padre.id);
      console.log('✓ Reverted');
      console.log('\nService role can update email, so the problem IS the RLS policy');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testDirectUpdate();
