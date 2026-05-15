import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing RLS Logging System with Authenticated User\n');
console.log('⚠️  This test requires an admin user email and password');
console.log('    Please ensure you have an admin account created\n');

async function testWithAuthenticatedUser() {
  try {
    // Check if we have admin credentials in environment
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'test123456';

    console.log(`Attempting to sign in as: ${adminEmail}`);
    console.log('(Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in .env to change)\n');

    // Try to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('\n💡 To test the logging system, you need to:');
      console.log('   1. Create an admin user in the database');
      console.log('   2. Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in your .env file');
      console.log('   3. Run this test again');
      return;
    }

    console.log('✅ Authenticated successfully!');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}\n`);

    // Find a padre to test with
    console.log('Step 1: Finding a test padre...');
    const { data: padres, error: padresError } = await supabase
      .from('padres')
      .select('id, email, nombre')
      .limit(1);

    if (padresError) throw padresError;
    if (!padres || padres.length === 0) {
      console.log('❌ No padres found in database');
      return;
    }

    const testPadre = padres[0];
    console.log(`✅ Found test padre: ${testPadre.nombre} (${testPadre.email})`);
    console.log(`   Padre ID: ${testPadre.id}\n`);

    // Insert test inscription
    console.log('Step 2: Inserting test inscription...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const fechaInicio = testDate.toISOString().split('T')[0];
    testDate.setDate(testDate.getDate() + 30);
    const fechaFin = testDate.toISOString().split('T')[0];

    const { data: insertData, error: insertError } = await supabase
      .from('comedor_inscripciones_padres')
      .insert({
        padre_id: testPadre.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_semana: [1, 2, 3, 4, 5],
        precio_diario: 5.50,
        activo: true
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError);
      console.log('\n   This could mean:');
      console.log('   - The authenticated user is not an admin');
      console.log('   - RLS policies are blocking the operation');
      console.log('   - There is an overlap constraint violation\n');
    } else {
      console.log('✅ Inscription created:', insertData.id);
      console.log(`   Date range: ${fechaInicio} to ${fechaFin}\n`);
    }

    // Check logs
    console.log('Step 3: Checking logs...');
    const { data: logs, error: logsError } = await supabase
      .rpc('get_recent_inscripcion_logs', { limit_count: 10 });

    if (logsError) {
      console.log('❌ Error fetching logs:', logsError);
      console.log('   Note: Only admins can view logs\n');
    } else if (logs && logs.length > 0) {
      console.log(`✅ Found ${logs.length} log entries:\n`);
      logs.forEach((log, idx) => {
        console.log(`Log ${idx + 1}:`);
        console.log(`  - Operation: ${log.operation}`);
        console.log(`  - User Email: ${log.user_email || 'NULL'}`);
        console.log(`  - Is Admin: ${log.is_admin_flag}`);
        console.log(`  - Padre ID: ${log.padre_id}`);
        console.log(`  - Inscription ID: ${log.inscripcion_id || 'NULL'}`);
        console.log(`  - Date Range: ${log.fecha_inicio} to ${log.fecha_fin}`);
        console.log(`  - Policy Matched: ${log.policy_matched}`);
        console.log(`  - Success: ${log.success}`);
        console.log(`  - Timestamp: ${log.created_at}\n`);
      });
    } else {
      console.log('⚠️  No logs found');
    }

    // Clean up: delete test inscription if it was created
    if (insertData) {
      console.log('Step 4: Cleaning up test inscription...');
      const { error: deleteError } = await supabase
        .from('comedor_inscripciones_padres')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        console.log('❌ Cleanup failed:', deleteError);
      } else {
        console.log('✅ Test inscription deleted\n');
      }

      // Check final logs
      console.log('Step 5: Checking final logs...');
      const { data: finalLogs } = await supabase
        .rpc('get_recent_inscripcion_logs', { limit_count: 5 });

      if (finalLogs && finalLogs.length > 0) {
        console.log(`✅ Found ${finalLogs.length} log entries (most recent):\n`);
        console.log('📊 Operations logged:');
        const summary = finalLogs.reduce((acc, log) => {
          acc[log.operation] = (acc[log.operation] || 0) + 1;
          return acc;
        }, {});
        Object.entries(summary).forEach(([op, count]) => {
          console.log(`   - ${op}: ${count}`);
        });
      }
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWithAuthenticatedUser();
