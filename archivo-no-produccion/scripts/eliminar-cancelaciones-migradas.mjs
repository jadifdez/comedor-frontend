import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== ELIMINANDO CANCELACIONES YA MIGRADAS ===\n');

// Consultar cuántas hay
const { count, error: errorCount } = await supabase
  .from('comedor_cancelaciones_ultimo_momento')
  .select('*', { count: 'exact', head: true });

if (errorCount) {
  console.error('❌ Error al contar cancelaciones:', errorCount);
  process.exit(1);
}

console.log(`📊 Total de cancelaciones a eliminar: ${count}\n`);

if (count === 0) {
  console.log('✅ No hay cancelaciones que eliminar.');
  process.exit(0);
}

console.log('⚠️  ADVERTENCIA: Esta acción eliminará TODOS los registros de comedor_cancelaciones_ultimo_momento');
console.log('⚠️  Asegúrate de haber ejecutado primero el script de migración.');
console.log('');
console.log('💡 Para confirmar la eliminación, ejecuta este script con el parámetro --confirmar:');
console.log('   node eliminar-cancelaciones-migradas.mjs --confirmar');
console.log('');

// Verificar si se pasó el parámetro de confirmación
const confirmar = process.argv.includes('--confirmar');

if (!confirmar) {
  console.log('❌ Eliminación cancelada. No se pasó el parámetro --confirmar');
  process.exit(0);
}

// Eliminar todos los registros
const { error: errorDelete } = await supabase
  .from('comedor_cancelaciones_ultimo_momento')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // Condición que siempre es verdadera

if (errorDelete) {
  console.error('❌ Error al eliminar cancelaciones:', errorDelete);
  process.exit(1);
}

console.log(`✅ Se eliminaron ${count} registros de comedor_cancelaciones_ultimo_momento`);
console.log('');
console.log('💡 La tabla está ahora vacía y lista para ser usada para nuevas cancelaciones.');
