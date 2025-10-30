import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

console.log('=== CREAR INVITACIONES USANDO SQL ===\n');

const borrame1Id = 'e3d1ce47-4970-49f8-8edf-baac57ad2638';

// Generar fechas
function generarFechasLaborables2025() {
  const fechas = [];
  const inicio = new Date(2025, 0, 1);
  const fin = new Date(2025, 11, 31);

  const current = new Date(inicio);
  while (current <= fin) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      fechas.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return fechas;
}

const fechas = generarFechasLaborables2025();
console.log('Generadas ' + fechas.length + ' fechas');

// Construir el INSERT SQL
const values = fechas.map(fecha => 
  `('${fecha}', '${borrame1Id}', NULL, NULL, 'Invitación anual 2025', '00000000-0000-0000-0000-000000000000')`
).join(',\n  ');

const sql = `
INSERT INTO invitaciones_comedor (fecha, hijo_id, padre_id, nombre_completo, motivo, created_by)
VALUES
  ${values};
`;

console.log('Ejecutando INSERT de ' + fechas.length + ' registros...');

const { data, error } = await supabase.rpc('exec_sql', { query: sql });

if (error) {
  console.error('Error:', error);
  
  // Intentar con execute_sql directo (método alternativo)
  console.log('\nIntentando método alternativo...');
  
  const { error: error2 } = await supabase
    .from('invitaciones_comedor')
    .insert(fechas.map(fecha => ({
      fecha,
      hijo_id: borrame1Id,
      padre_id: null,
      nombre_completo: null,
      motivo: 'Invitación anual 2025',
      created_by: '00000000-0000-0000-0000-000000000000'
    })))
    .select();

  if (error2) {
    console.error('Error2:', error2.message);
  } else {
    console.log('✓ Insertado correctamente por método alternativo');
  }
} else {
  console.log('✓ Insertado correctamente');
}

// Verificar
const { count } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact', head: true })
  .eq('hijo_id', borrame1Id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

console.log('\nTotal en BD: ' + (count || 0));
