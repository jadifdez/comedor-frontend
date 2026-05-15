import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing inscription filter...\n');

  // Simular diciembre 2025
  const mesSeleccionado = '2025-12';
  const [year, month] = mesSeleccionado.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

  console.log('Fecha inicio mes:', fechaInicioMes);
  console.log('Fecha fin mes:', fechaFinMes);
  console.log('');

  // El filtro exacto que usa el código
  const filtro = `and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`;
  console.log('Filtro:', filtro);
  console.log('');

  const { data, error } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .or(filtro);

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Details:', error);
  } else {
    console.log('✓ Inscripciones encontradas:', data?.length || 0);

    // Buscar Patricia
    const patricia = data?.find(i => i.padre_id === '296bb796-f27f-4aee-b502-c6bd6b56bb77');
    if (patricia) {
      console.log('✓ Patricia ENCONTRADA:');
      console.log(JSON.stringify(patricia, null, 2));
    } else {
      console.log('❌ Patricia NO encontrada en los resultados');
      console.log('\nTodas las inscripciones:');
      data?.forEach(i => {
        console.log('  -', i.padre_id, '| activo:', i.activo, '| inicio:', i.fecha_inicio);
      });
    }
  }
}

test();
