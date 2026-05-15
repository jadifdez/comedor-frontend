import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing SIMPLIFIED inscription filter...\n');

  // Simular diciembre 2025
  const mesSeleccionado = '2025-12';
  const [year, month] = mesSeleccionado.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

  console.log('Mes:', mesSeleccionado);
  console.log('Rango:', fechaInicioMes, 'a', fechaFinMes);
  console.log('');

  // El filtro SIMPLIFICADO
  console.log('Filtro simplificado:');
  console.log(`.lte('fecha_inicio', '${fechaFinMes}')`);
  console.log(`.or('fecha_fin.is.null,fecha_fin.gte.${fechaInicioMes}')`);
  console.log('');

  const { data, error, count } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*', { count: 'exact' })
    .lte('fecha_inicio', fechaFinMes)
    .or(`fecha_fin.is.null,fecha_fin.gte.${fechaInicioMes}`);

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
  } else {
    console.log('✓ Query ejecutado exitosamente');
    console.log('Total inscripciones:', count);
    console.log('');

    if (data && data.length > 0) {
      console.log('Primeras 5 inscripciones:');
      data.slice(0, 5).forEach(i => {
        console.log('  - Padre:', i.padre_id.substring(0, 8), '| días:', i.dias_semana, '| activo:', i.activo);
      });
      console.log('');

      // Buscar Patricia
      const patricia = data.find(i => i.padre_id === '296bb796-f27f-4aee-b502-c6bd6b56bb77');
      if (patricia) {
        console.log('✓✓✓ Patricia ENCONTRADA!');
        console.log(JSON.stringify(patricia, null, 2));
      } else {
        console.log('❌ Patricia NO encontrada');
      }
    } else {
      console.log('(Sin resultados - esperado con anon key)');
    }
  }
}

test();
