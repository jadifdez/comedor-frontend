import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== BUSCAR ALUMNOS CON NOMBRE "BORRAME" ===\n');

const { data: hijos, error: hijosError } = await supabase
  .from('hijos')
  .select('*')
  .or('nombre.ilike.%borrame%,nombre.ilike.%borra%');

if (hijosError) {
  console.error('Error:', hijosError);
  process.exit(1);
}

if (!hijos || hijos.length === 0) {
  console.log('No se encontraron alumnos con ese patron');
  
  console.log('\nBuscando todos los alumnos (primeros 20)...\n');
  const { data: todosHijos, error: error2 } = await supabase
    .from('hijos')
    .select('id, nombre, activo')
    .limit(20);
  
  if (todosHijos) {
    todosHijos.forEach(h => {
      console.log('- ' + h.nombre + ' (ID: ' + h.id.substring(0, 8) + '..., Activo: ' + h.activo + ')');
    });
  }
} else {
  console.log('Encontrados ' + hijos.length + ' alumnos:\n');
  hijos.forEach(h => {
    console.log('- ' + h.nombre + ' (ID: ' + h.id + ', Activo: ' + h.activo + ')');
  });
}
