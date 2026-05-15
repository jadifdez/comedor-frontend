import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function buscarTorresLuna() {
  console.log('=== BUSCANDO TORRES LUNA CON SERVICE ROLE ===\n');

  // 1. Buscar en altas puntuales
  const { data: altas, error: altasError } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (altasError) {
    console.error('Error buscando altas:', altasError);
    return;
  }

  console.log(`Total altas puntuales: ${altas?.length || 0}\n`);

  // Buscar Torres Luna
  const torresLuna = altas?.filter(a =>
    a.hijo.toLowerCase().includes('torres') ||
    a.hijo.toLowerCase().includes('luna') ||
    a.hijo.toLowerCase().includes('alejandro')
  );

  console.log(`Altas de Torres Luna encontradas: ${torresLuna?.length || 0}\n`);

  if (torresLuna && torresLuna.length > 0) {
    torresLuna.forEach(a => {
      console.log('ALTA ENCONTRADA:');
      console.log(JSON.stringify(a, null, 2));
      console.log('\n');
    });

    // Para cada alta, buscar el hijo
    for (const alta of torresLuna) {
      if (alta.hijo_id) {
        console.log(`\n=== Buscando datos del hijo ${alta.hijo_id} ===`);

        const { data: hijo, error: hijoError } = await supabase
          .from('hijos')
          .select('*, padres(*)')
          .eq('id', alta.hijo_id)
          .single();

        if (hijoError) {
          console.error('Error:', hijoError);
        } else {
          console.log('HIJO:');
          console.log(JSON.stringify(hijo, null, 2));
        }
      }
    }
  }

  // Buscar altas para el 9 de diciembre
  console.log('\n\n=== ALTAS PARA EL 9 DE DICIEMBRE ===\n');

  const altasDic9 = altas?.filter(a => a.fecha === '09/12/2025');

  console.log(`Total: ${altasDic9?.length || 0}`);

  if (altasDic9 && altasDic9.length > 0) {
    altasDic9.forEach(a => {
      console.log(`\n- ${a.hijo} (${a.curso})`);
      console.log(`  ID: ${a.id}`);
      console.log(`  Estado: ${a.estado}`);
      console.log(`  Hijo ID: ${a.hijo_id}`);
    });
  }
}

buscarTorresLuna().catch(console.error);
