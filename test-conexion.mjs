import { createClient } from '@supabase/supabase-js';

const url = 'https://iilgvjlbrwfvwkslmhfr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w';

const supabase = createClient(url, key);

console.log('Probando conexion a: ' + url + '\n');

// Probar varias tablas
const tablas = ['invitaciones_comedor', 'hijos', 'comedor_inscripciones', 'padres'];

for (const tabla of tablas) {
  try {
    const { count, error, data } = await supabase
      .from(tabla)
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.log('Tabla "' + tabla + '": ERROR - ' + error.message);
    } else {
      console.log('Tabla "' + tabla + '": ' + (count || 0) + ' registros');
      if (data && data.length > 0) {
        console.log('  Ejemplo: ' + JSON.stringify(Object.keys(data[0])));
      }
    }
  } catch (e) {
    console.log('Tabla "' + tabla + '": EXCEPCION - ' + e.message);
  }
}

console.log('\n=== Buscando invitaciones sin filtro de fecha ===');
const { data: todasInv, count: totalInv } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact' })
  .limit(5);

console.log('Total: ' + (totalInv || 0));
if (todasInv && todasInv.length > 0) {
  console.log('Primeras invitaciones:');
  todasInv.forEach(inv => {
    console.log('  - Fecha: ' + inv.fecha + ', Hijo: ' + inv.hijo_id.substring(0, 8) + '...');
  });
}
