import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  // Llamar a la función RPC
  const { data, error } = await supabase.rpc('get_personal_with_counts');

  if (error) {
    console.log('Error llamando RPC:', error);
    return;
  }

  // Buscar a Patricia
  const patricia = data?.find(p => p.nombre.includes('Almagro') && p.nombre.includes('Patricia'));

  if (patricia) {
    console.log('Patricia encontrada en RPC:');
    console.log(JSON.stringify(patricia, null, 2));
  } else {
    console.log('Patricia no encontrada en RPC');
  }

  // Mostrar todos para ver el formato
  console.log('\n\nTodos los miembros del personal:');
  data?.forEach(p => {
    console.log(`${p.nombre} - Tiene inscripción: ${p.tiene_inscripcion_activa}, Hijos: ${p.hijos_count}`);
  });
}

check();
