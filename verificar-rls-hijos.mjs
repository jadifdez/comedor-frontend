import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== VERIFICANDO RLS EN TABLA HIJOS ===\n');

// Intento 1: sin autenticacion
console.log('1. Intento sin autenticacion:');
const { data: hijos1, count: count1, error: error1 } = await supabase
  .from('hijos')
  .select('*', { count: 'exact' })
  .limit(5);

console.log('   Count: ' + (count1 || 0));
console.log('   Error: ' + (error1 ? error1.message : 'ninguno'));
console.log('   Datos: ' + (hijos1 ? hijos1.length : 0) + ' registros\n');

// Intento 2: usando rpc o diferentes filtros
console.log('2. Probando con diferentes queries:');

// Query simple
const { count: count2 } = await supabase
  .from('hijos')
  .select('id', { count: 'exact', head: true });
console.log('   Count (solo id): ' + (count2 !== null ? count2 : 'null') + '\n');

// Query con filtro activo
const { data: hijos3, count: count3 } = await supabase
  .from('hijos')
  .select('*', { count: 'exact' })
  .eq('activo', true)
  .limit(5);
console.log('   Con activo=true: count=' + (count3 || 0) + ', datos=' + (hijos3 ? hijos3.length : 0) + '\n');

// Probar con order
const { data: hijos4, count: count4 } = await supabase
  .from('hijos')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(10);
console.log('   Con order: count=' + (count4 || 0) + ', datos=' + (hijos4 ? hijos4.length : 0));

if (hijos4 && hijos4.length > 0) {
  console.log('\n   Primeros hijos encontrados:');
  hijos4.forEach(h => {
    console.log('     - ' + h.nombre + ' (ID: ' + h.id.substring(0, 8) + '..., Activo: ' + h.activo + ')');
  });
}

// Ahora buscar invitaciones
console.log('\n=== VERIFICANDO INVITACIONES ===\n');

const { data: inv, count: countInv } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact' })
  .limit(5);

console.log('Invitaciones: count=' + (countInv || 0) + ', datos=' + (inv ? inv.length : 0));

if (inv && inv.length > 0) {
  console.log('\nPrimeras invitaciones:');
  inv.forEach(i => {
    console.log('  - Fecha: ' + i.fecha + ', Hijo ID: ' + i.hijo_id.substring(0, 8) + '...');
  });
}

// Buscar invitaciones en 2025
console.log('\n=== INVITACIONES EN 2025 ===\n');

const { data: inv2025, count: count2025 } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact' })
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

console.log('Total en 2025: ' + (count2025 || 0));

if (inv2025 && inv2025.length > 0) {
  console.log('Primeras 10 invitaciones de 2025:');
  inv2025.slice(0, 10).forEach(i => {
    console.log('  - ' + i.fecha);
  });
}

console.log('\n=== FIN ===');
