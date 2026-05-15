import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  // Login como admin
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@lospinos.edu',
    password: 'Admin1975!'
  });

  if (loginError) {
    console.log('Error en login:', loginError.message);
    return;
  }

  console.log('✓ Login exitoso como admin\n');

  // Buscar a Patricia
  const { data: patricia, error: errorPadre } = await supabase
    .from('padres')
    .select('id, nombre, es_personal')
    .ilike('nombre', '%almagro%patricia%')
    .maybeSingle();

  if (errorPadre) {
    console.log('Error buscando Patricia:', errorPadre.message);
    return;
  }

  console.log('✓ Patricia encontrada:');
  console.log('  ID:', patricia.id);
  console.log('  Nombre:', patricia.nombre);
  console.log('  Es personal:', patricia.es_personal);
  console.log('');

  // Buscar inscripciones de Patricia
  const { data: inscripciones, error: errorInsc } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .eq('padre_id', patricia.id);

  if (errorInsc) {
    console.log('✗ Error buscando inscripciones:', errorInsc.message);
    return;
  }

  console.log('✓ Inscripciones de Patricia:');
  if (inscripciones && inscripciones.length > 0) {
    inscripciones.forEach(insc => {
      console.log('  - ID:', insc.id);
      console.log('    Días:', insc.dias_semana);
      console.log('    Precio diario:', insc.precio_diario);
      console.log('    Activo:', insc.activo);
      console.log('    Fecha inicio:', insc.fecha_inicio);
      console.log('');
    });
  } else {
    console.log('  (ninguna inscripción encontrada)');
  }

  await supabase.auth.signOut();
}

test();
