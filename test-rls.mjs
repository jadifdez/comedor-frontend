import { createClient } from '@supabase/supabase-js';

console.log('=== PRUEBA DE ACCESO A BASE DE DATOS ===\n');

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('Intentando listar tablas disponibles...\n');

const tablas = ['hijos', 'invitaciones_comedor', 'comedor_inscripciones', 'usuarios', 'festivos'];

for (const tabla of tablas) {
  console.log('Probando tabla: ' + tabla);
  const { count, error } = await supabase
    .from(tabla)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('  ✗ Error: ' + error.message);
  } else {
    console.log('  ✓ Accesible - Registros: ' + (count || 0));
  }
}

console.log('\n=== FIN ===');
