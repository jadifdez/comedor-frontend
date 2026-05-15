import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function buscarHijos() {
  // Buscar por variaciones del nombre
  const variaciones = ['torres', 'alejandro', 'luna'];

  for (const variacion of variaciones) {
    console.log(`\n=== Buscando: ${variacion} ===`);
    const { data, error } = await supabase
      .from('hijos')
      .select('id, nombre, activo')
      .ilike('nombre', `%${variacion}%`);

    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`Encontrados: ${data?.length || 0} resultados`);
      if (data && data.length > 0) {
        data.forEach(h => console.log(`  - ${h.nombre} (${h.id})`));
      }
    }
  }

  // También buscar en altas puntuales
  console.log('\n=== Buscando en altas puntuales ===');
  const { data: altas, error: altasError } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .ilike('hijo', '%torres%')
    .order('fecha_creacion', { ascending: false });

  if (altasError) {
    console.error('Error:', altasError);
  } else {
    console.log(`Encontrados: ${altas?.length || 0} altas`);
    if (altas && altas.length > 0) {
      altas.forEach(a => {
        console.log(`\n  Alta ID: ${a.id}`);
        console.log(`  Hijo: ${a.hijo}`);
        console.log(`  Hijo ID: ${a.hijo_id}`);
        console.log(`  Fecha: ${a.fecha}`);
        console.log(`  Estado: ${a.estado}`);
        console.log(`  Curso: ${a.curso}`);
      });
    }
  }
}

buscarHijos().catch(console.error);
