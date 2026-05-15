import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== EXPLORACION DE TABLAS ===\n');

const tablasPosibles = [
  'invitaciones_comedor',
  'invitaciones',
  'hijos',
  'padres',
  'comedor_inscripciones',
  'grados',
  'festivos',
  'solicitudes_comida',
  'bajas_comedor',
  'enfermedades',
  'elecciones_menu',
  'opciones_menu_principal',
  'opciones_menu_guarnicion',
  'administradores',
  'comedor_inscripciones_padres'
];

for (const tabla of tablasPosibles) {
  const { count, error } = await supabase
    .from(tabla)
    .select('*', { count: 'exact', head: true });
  
  if (!error) {
    if (count && count > 0) {
      console.log('✓ ' + tabla.padEnd(35) + ': ' + count + ' registros');
    } else {
      console.log('  ' + tabla.padEnd(35) + ': 0 registros');
    }
  } else {
    console.log('✗ ' + tabla.padEnd(35) + ': ' + error.message);
  }
}

console.log('\n=== Buscando tablas con mas de 100 registros ===\n');

for (const tabla of tablasPosibles) {
  const { count, data, error } = await supabase
    .from(tabla)
    .select('*', { count: 'exact' })
    .limit(2);
  
  if (!error && count && count > 100) {
    console.log(tabla + ': ' + count + ' registros');
    if (data && data.length > 0) {
      console.log('  Columnas: ' + Object.keys(data[0]).join(', '));
      console.log('  Ejemplo: ' + JSON.stringify(data[0]).substring(0, 150) + '...');
    }
    console.log('');
  }
}

console.log('=== FIN ===');
