import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iilgvjlbrwfvwkslmhfr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdatePadre() {
  console.log('1. Iniciando sesión como antoniogamez@gmail.com...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'antoniogamez@gmail.com',
    password: 'antonio'
  });

  if (authError) {
    console.error('Error al iniciar sesión:', authError);
    return;
  }

  console.log('✓ Sesión iniciada correctamente');
  console.log('User ID:', authData.user.id);
  console.log('Email:', authData.user.email);

  console.log('\n2. Obteniendo datos del padre...');
  const { data: padreData, error: padreError } = await supabase
    .from('padres')
    .select('*')
    .eq('email', 'antoniogamez@gmail.com')
    .maybeSingle();

  if (padreError) {
    console.error('Error al obtener padre:', padreError);
    return;
  }

  console.log('✓ Padre obtenido:', padreData);
  console.log('Padre ID:', padreData.id);
  console.log('Padre user_id:', padreData.user_id);
  console.log('¿user_id coincide con auth.user.id?', padreData.user_id === authData.user.id);

  console.log('\n3. Intentando actualizar el email a vidanez@gmail.com...');
  const { data: updateData, error: updateError } = await supabase
    .from('padres')
    .update({
      nombre: padreData.nombre,
      email: 'vidanez@gmail.com',
      telefono: padreData.telefono
    })
    .eq('id', padreData.id);

  if (updateError) {
    console.error('❌ Error al actualizar:', updateError);
    console.error('Código:', updateError.code);
    console.error('Mensaje:', updateError.message);
    return;
  }

  console.log('✓ ¡Actualización exitosa!');
  console.log('Datos actualizados:', updateData);

  console.log('\n4. Verificando actualización...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('padres')
    .select('*')
    .eq('id', padreData.id)
    .maybeSingle();

  if (verifyError) {
    console.error('Error al verificar:', verifyError);
    return;
  }

  console.log('✓ Datos actualizados en DB:', verifyData);
}

testUpdatePadre().catch(console.error);
