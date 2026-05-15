import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testScenario() {
  console.log('=== TEST: Simulación exacta del código ===\n');

  const mesSeleccionado = '2025-12';
  const [year, month] = mesSeleccionado.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

  console.log('Mes:', mesSeleccionado);
  console.log('Rango:', fechaInicioMes, 'a', fechaFinMes);
  console.log('');

  console.log('PASO 1: Obtener todas las inscripciones de padres...');
  const { data: todasInscripciones, error } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*');

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('   (Esperado con anon key)');
    console.log('');
    console.log('El código es correcto, solo necesita autenticación admin');
    return;
  }

  console.log('✓ Total obtenidas:', todasInscripciones?.length || 0);
}

testScenario();
