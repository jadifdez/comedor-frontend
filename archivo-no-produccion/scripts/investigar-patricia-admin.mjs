import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function investigar() {
  // Login como admin
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: 'antoniogamez@gmail.com',
    password: 'Antonio1975'
  });

  if (loginError) {
    console.log('Error en login:', loginError);
    return;
  }

  console.log('Login exitoso como admin');

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
    console.log('Detalles:', JSON.stringify(errorInsc, null, 2));
    return;
  }

  console.log('\nInscripciones de comedor de Patricia:');
  console.log(JSON.stringify(inscripciones, null, 2));

  // Buscar TODAS las inscripciones de padres para ver si hay alguna
  const { data: todasInscripciones, error: errorTodas } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .limit(5);

  if (errorTodas) {
    console.log('\nError buscando todas las inscripciones:', errorTodas);
    return;
  }

  console.log('\nPrimeras 5 inscripciones de padres (para ver si la tabla funciona):');
  console.log(JSON.stringify(todasInscripciones, null, 2));

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

  await supabase.auth.signOut();
}

investigar();
