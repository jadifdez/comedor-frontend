import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== VERIFICAR ESTRUCTURA Y DATOS ===\n');

console.log('1. Contando hijos...');
const { count: countHijos, error: e1 } = await supabase
  .from('hijos')
  .select('*', { count: 'exact', head: true });

console.log('Total hijos: ' + (countHijos || 0));

console.log('\n2. Buscando invitaciones en 2025...');
const { data: invitaciones2025, error: e2 } = await supabase
  .from('invitaciones')
  .select('id, hijo_id, fecha')
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31')
  .order('fecha', { ascending: true })
  .limit(5);

if (e2) {
  console.error('Error:', e2);
} else {
  console.log('Primeras 5 invitaciones en 2025:');
  if (invitaciones2025 && invitaciones2025.length > 0) {
    for (const inv of invitaciones2025) {
      console.log('  - Fecha: ' + inv.fecha + ', Hijo ID: ' + inv.hijo_id.substring(0, 8) + '...');
      
      const { data: hijo } = await supabase
        .from('hijos')
        .select('nombre')
        .eq('id', inv.hijo_id)
        .single();
      
      if (hijo) {
        console.log('    Alumno: ' + hijo.nombre);
      }
    }
  } else {
    console.log('  No hay invitaciones en 2025');
  }
}

console.log('\n3. Contando invitaciones por hijo en 2025...');
const { data: invitacionesPorHijo, error: e3 } = await supabase
  .from('invitaciones')
  .select('hijo_id')
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

if (invitacionesPorHijo) {
  const conteo = {};
  invitacionesPorHijo.forEach(inv => {
    if (!conteo[inv.hijo_id]) {
      conteo[inv.hijo_id] = 0;
    }
    conteo[inv.hijo_id]++;
  });
  
  console.log('Total de hijos con invitaciones en 2025: ' + Object.keys(conteo).length);
  console.log('\nTop 5 hijos con mas invitaciones en 2025:');
  
  const ordenado = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  for (const [hijoId, cantidad] of ordenado) {
    const { data: hijo } = await supabase
      .from('hijos')
      .select('nombre')
      .eq('id', hijoId)
      .single();
    
    console.log('  - ' + (hijo ? hijo.nombre : 'Desconocido') + ': ' + cantidad + ' invitaciones');
  }
}

console.log('\n=== FIN ===');
