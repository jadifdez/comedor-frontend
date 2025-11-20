import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing RLS Logging System for inscripciones_padres\n');

async function testLoggingSystem() {
  try {
    // Step 1: Find a test padre
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

    // Step 2: Clear existing logs
    console.log('Step 2: Clearing existing logs...');
    await supabase
      .from('comedor_inscripciones_padres_logs')
      .delete()
      .neq('id', 0);
    console.log('✅ Logs cleared\n');

    // Step 3: Insert a test inscription (as service role/admin)
    console.log('Step 3: Inserting test inscription as admin...');
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
        dias_semana: [1, 2, 3, 4, 5], // 1=Monday, 5=Friday
        precio_diario: 5.50,
        activo: true
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert error:', insertError);
    } else {
      console.log('✅ Inscription created:', insertData.id);
      console.log(`   Date range: ${fechaInicio} to ${fechaFin}\n`);
    }

    // Step 4: Check logs after insert
    console.log('Step 4: Checking logs after INSERT operation...');
    const { data: logsAfterInsert, error: logsError1 } = await supabase
      .rpc('get_recent_inscripcion_logs', { limit_count: 10 });

    if (logsError1) {
      console.log('❌ Error fetching logs:', logsError1);
    } else if (logsAfterInsert && logsAfterInsert.length > 0) {
      console.log(`✅ Found ${logsAfterInsert.length} log entries:`);
      logsAfterInsert.forEach((log, idx) => {
        console.log(`\n   Log ${idx + 1}:`);
        console.log(`   - Operation: ${log.operation}`);
        console.log(`   - User Email: ${log.user_email || 'NULL'}`);
        console.log(`   - User ID: ${log.user_id || 'NULL'}`);
        console.log(`   - Is Admin: ${log.is_admin_flag}`);
        console.log(`   - Padre ID: ${log.padre_id}`);
        console.log(`   - Inscription ID: ${log.inscripcion_id}`);
        console.log(`   - Policy Matched: ${log.policy_matched}`);
        console.log(`   - Success: ${log.success}`);
        console.log(`   - Created At: ${log.created_at}`);
      });
    } else {
      console.log('⚠️  No logs found after insert');
    }

    // Step 5: Update the inscription
    if (insertData) {
      console.log('\n\nStep 5: Updating test inscription...');
      const { error: updateError } = await supabase
        .from('comedor_inscripciones_padres')
        .update({ precio_diario: 6.00 })
        .eq('id', insertData.id);

      if (updateError) {
        console.log('❌ Update error:', updateError);
      } else {
        console.log('✅ Inscription updated\n');
      }

      // Step 6: Check logs after update
      console.log('Step 6: Checking logs after UPDATE operation...');
      const { data: logsAfterUpdate, error: logsError2 } = await supabase
        .rpc('get_recent_inscripcion_logs', { limit_count: 10 });

      if (logsError2) {
        console.log('❌ Error fetching logs:', logsError2);
      } else if (logsAfterUpdate && logsAfterUpdate.length > 0) {
        console.log(`✅ Found ${logsAfterUpdate.length} log entries (showing most recent):`);
        const latestLog = logsAfterUpdate[0];
        console.log(`\n   Latest Log:`);
        console.log(`   - Operation: ${latestLog.operation}`);
        console.log(`   - User Email: ${latestLog.user_email || 'NULL'}`);
        console.log(`   - Is Admin: ${latestLog.is_admin_flag}`);
        console.log(`   - Policy Matched: ${latestLog.policy_matched}`);
        console.log(`   - Success: ${latestLog.success}`);
      }

      // Step 7: Delete the inscription
      console.log('\n\nStep 7: Deleting test inscription...');
      const { error: deleteError } = await supabase
        .from('comedor_inscripciones_padres')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        console.log('❌ Delete error:', deleteError);
      } else {
        console.log('✅ Inscription deleted\n');
      }

      // Step 8: Final log check
      console.log('Step 8: Checking final logs after DELETE operation...');
      const { data: finalLogs, error: logsError3 } = await supabase
        .rpc('get_recent_inscripcion_logs', { limit_count: 10 });

      if (logsError3) {
        console.log('❌ Error fetching logs:', logsError3);
      } else if (finalLogs && finalLogs.length > 0) {
        console.log(`✅ Found ${finalLogs.length} total log entries`);
        console.log('\n📊 Summary of operations logged:');
        const summary = finalLogs.reduce((acc, log) => {
          acc[log.operation] = (acc[log.operation] || 0) + 1;
          return acc;
        }, {});
        Object.entries(summary).forEach(([op, count]) => {
          console.log(`   - ${op}: ${count} entries`);
        });

        console.log('\n📋 Policy matches:');
        const policies = finalLogs.reduce((acc, log) => {
          acc[log.policy_matched] = (acc[log.policy_matched] || 0) + 1;
          return acc;
        }, {});
        Object.entries(policies).forEach(([policy, count]) => {
          console.log(`   - ${policy}: ${count} times`);
        });
      }
    }

    console.log('\n\n✅ Logging system test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the logs in the admin panel or Supabase dashboard');
    console.log('   2. Verify that all operations (INSERT, UPDATE, DELETE) are being logged');
    console.log('   3. Confirm that policy matching is working correctly');
    console.log('   4. Use get_recent_inscripcion_logs() to analyze real user operations');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLoggingSystem();
