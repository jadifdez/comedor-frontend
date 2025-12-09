import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== CONSULTANDO CANCELACIONES DE ÚLTIMO MOMENTO ===\n');

const { data: cancelaciones, error } = await supabase
  .from('comedor_cancelaciones_ultimo_momento')
  .select('*')
  .order('fecha', { ascending: true });

if (error) {
  console.error('❌ Error al consultar cancelaciones:', error);
  process.exit(1);
}

console.log(`📊 Total de cancelaciones encontradas: ${cancelaciones.length}\n`);

if (cancelaciones.length === 0) {
  console.log('✅ No hay cancelaciones que migrar.');
  process.exit(0);
}

// Agrupar por tipo
const porHijos = cancelaciones.filter(c => c.hijo_id);
const porPadres = cancelaciones.filter(c => c.padre_id && !c.hijo_id);

console.log(`👶 Cancelaciones de hijos: ${porHijos.length}`);
console.log(`👨‍🏫 Cancelaciones de personal: ${porPadres.length}\n`);

console.log('=== DETALLE DE CANCELACIONES ===\n');

for (const cancelacion of cancelaciones) {
  console.log('---');
  console.log(`Fecha: ${cancelacion.fecha}`);
  console.log(`Hijo ID: ${cancelacion.hijo_id || 'NULL'}`);
  console.log(`Padre ID: ${cancelacion.padre_id || 'NULL'}`);
  console.log(`Motivo: ${cancelacion.motivo || 'Sin motivo'}`);
  console.log(`Cancelado por: ${cancelacion.cancelado_por || 'NULL'}`);
  console.log(`Creado: ${cancelacion.created_at}`);

  // Obtener detalles del hijo o padre
  if (cancelacion.hijo_id) {
    const { data: hijo } = await supabase
      .from('hijos')
      .select('nombre, grado:grados(nombre)')
      .eq('id', cancelacion.hijo_id)
      .maybeSingle();

    if (hijo) {
      console.log(`  → Hijo: ${hijo.nombre}`);
      console.log(`  → Curso: ${hijo.grado?.nombre || 'Sin curso'}`);
    }
  } else if (cancelacion.padre_id) {
    const { data: padre } = await supabase
      .from('padres')
      .select('nombre')
      .eq('id', cancelacion.padre_id)
      .maybeSingle();

    if (padre) {
      console.log(`  → Personal: ${padre.nombre}`);
    }
  }
  console.log('');
}

console.log('\n✅ Consulta completada');
