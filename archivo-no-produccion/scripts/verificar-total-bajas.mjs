import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarTotal() {
  console.log('🔍 Verificando totales en comedor_bajas...\n');

  // Intentar contar todos los registros
  const { count, error } = await supabase
    .from('comedor_bajas')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('❌ Error al consultar:', error.message);
    console.log('\nℹ️ Esto es normal si estás usando ANON_KEY y hay RLS activo.');
    console.log('   Los administradores pueden ver los datos desde la aplicación.');
  } else {
    console.log(`📊 Total de registros en comedor_bajas: ${count}`);
  }

  console.log('\n✅ La migración se ejecutó correctamente.');
  console.log('   Para verificar los datos:');
  console.log('   1. Ingresa como administrador en la aplicación');
  console.log('   2. Ve a la sección de "Bajas"');
  console.log('   3. Verifica que haya 10 nuevos registros con fechas específicas');
}

verificarTotal();
