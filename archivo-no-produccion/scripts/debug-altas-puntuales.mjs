import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function investigar() {
  console.log('🔍 Investigando altas puntuales...\n');

  // Buscar todas las altas puntuales recientes
  const { data: altas, error } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📋 Total de altas recientes: ${altas.length}\n`);

  altas.forEach((alta, index) => {
    console.log(`${index + 1}. ${alta.hijo}`);
    console.log(`   Fecha guardada: "${alta.fecha}"`);
    console.log(`   Hijo ID: ${alta.hijo_id}`);
    console.log(`   Padre ID: ${alta.padre_id}`);
    console.log(`   Estado: ${alta.estado}`);
    console.log('');
  });

  // Probar el formato de fecha que esperamos
  const testDate = new Date('2025-12-09');
  const fechaEspanol = testDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  console.log(`\n📅 Formato de fecha esperado para 2025-12-09: "${fechaEspanol}"\n`);

  // Buscar altas puntuales para esa fecha específica
  const { data: altasHoy, error: errorHoy } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .eq('fecha', fechaEspanol)
    .eq('estado', 'aprobada');

  if (errorHoy) {
    console.error('❌ Error buscando por fecha:', errorHoy);
    return;
  }

  console.log(`✅ Altas puntuales encontradas para "${fechaEspanol}": ${altasHoy.length}`);
  altasHoy.forEach(alta => {
    console.log(`   - ${alta.hijo}`);
  });
}

investigar();
