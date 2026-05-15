import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function investigar() {
  // Buscar a Patricia
  const { data: patricia, error: errorPadre } = await supabase
    .from('padres')
    .select('*')
    .ilike('nombre', '%almagro%patricia%')
    .maybeSingle();

  if (errorPadre) {
    console.log('Error buscando padre:', errorPadre);
    return;
  }

  if (!patricia) {
    console.log('Patricia no encontrada');
    return;
  }

  console.log('Patricia encontrada:');
  console.log('ID:', patricia.id);
  console.log('Nombre:', patricia.nombre);
  console.log('Es personal:', patricia.es_personal);
  console.log('Activo:', patricia.activo);

  // Buscar inscripción de comedor de Patricia
  const { data: inscripciones, error: errorInsc } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .eq('padre_id', patricia.id);

  if (errorInsc) {
    console.log('Error buscando inscripción:', errorInsc);
    return;
  }

  console.log('\nInscripciones de comedor de Patricia:');
  console.log(JSON.stringify(inscripciones, null, 2));

  // Buscar sus hijos
  const { data: hijos, error: errorHijos } = await supabase
    .from('hijos')
    .select('*')
    .eq('padre_id', patricia.id);

  if (errorHijos) {
    console.log('Error buscando hijos:', errorHijos);
    return;
  }

  console.log('\nHijos de Patricia:');
  console.log(JSON.stringify(hijos, null, 2));
}

investigar();
