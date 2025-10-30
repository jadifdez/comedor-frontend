import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer archivo .env
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

console.log('=== CREAR INVITACIONES PARA BORRAME1 (2025) ===\n');

const borrame1Id = 'e3d1ce47-4970-49f8-8edf-baac57ad2638';

// Función para generar fechas laborables (L-V) de 2025
function generarFechasLaborables2025() {
  const fechas = [];
  const inicio = new Date(2025, 0, 1); // 1 de enero 2025
  const fin = new Date(2025, 11, 31); // 31 de diciembre 2025

  const current = new Date(inicio);
  while (current <= fin) {
    const dow = current.getDay();
    // Si es lunes a viernes (1-5)
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
console.log('Fechas generadas: ' + fechas.length);
console.log('Primera: ' + fechas[0]);
console.log('Última: ' + fechas[fechas.length - 1]);

// Obtener el ID del administrador que creó el sistema
const { data: adminData } = await supabase
  .from('administradores')
  .select('user_id')
  .limit(1)
  .maybeSingle();

const createdBy = adminData?.user_id || '00000000-0000-0000-0000-000000000000';

console.log('\nCreando invitaciones en lotes de 100...');

// Insertar en lotes para evitar problemas
const BATCH_SIZE = 100;
let totalInsertadas = 0;

for (let i = 0; i < fechas.length; i += BATCH_SIZE) {
  const batch = fechas.slice(i, i + BATCH_SIZE);
  
  const invitaciones = batch.map(fecha => ({
    fecha,
    hijo_id: borrame1Id,
    padre_id: null,
    nombre_completo: null,
    motivo: 'Invitación anual 2025',
    created_by: createdBy
  }));

  const { error, count } = await supabase
    .from('invitaciones_comedor')
    .insert(invitaciones);

  if (error) {
    console.error('Error en lote ' + (i / BATCH_SIZE + 1) + ':', error.message);
    break;
  }

  totalInsertadas += batch.length;
  console.log('Lote ' + (i / BATCH_SIZE + 1) + ': ' + batch.length + ' invitaciones insertadas (Total: ' + totalInsertadas + ')');
}

console.log('\n=== VERIFICACIÓN FINAL ===\n');

// Verificar que se insertaron correctamente
const { count: countTotal } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact', head: true })
  .eq('hijo_id', borrame1Id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

console.log('Total de invitaciones en BD: ' + (countTotal || 0));

// Verificar por mes
const { data: porMes } = await supabase
  .from('invitaciones_comedor')
  .select('fecha')
  .eq('hijo_id', borrame1Id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

if (porMes) {
  const meses = {};
  porMes.forEach(inv => {
    const mes = inv.fecha.substring(0, 7);
    if (!meses[mes]) meses[mes] = 0;
    meses[mes]++;
  });

  console.log('\nDistribución por mes:');
  const nombresM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  for (let i = 1; i <= 12; i++) {
    const key = '2025-' + String(i).padStart(2, '0');
    console.log('  ' + nombresM[i-1] + ': ' + (meses[key] || 0));
  }
}

// Verificar días de semana
const { data: todas } = await supabase
  .from('invitaciones_comedor')
  .select('fecha')
  .eq('hijo_id', borrame1Id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

if (todas) {
  const porDia = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  todas.forEach(inv => {
    const [y, m, d] = inv.fecha.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    porDia[date.getDay()]++;
  });

  console.log('\nDistribución por día de semana:');
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i <= 6; i++) {
    if (porDia[i] > 0) {
      console.log('  ' + dias[i] + ': ' + porDia[i] + ((i === 0 || i === 6) ? ' ⚠️ ADVERTENCIA' : ''));
    }
  }
}

if (countTotal === 261) {
  console.log('\n✓✓✓ ÉXITO: Se insertaron correctamente 261 invitaciones para borrame1 ✓✓✓');
} else {
  console.log('\n✗✗✗ ERROR: Se esperaban 261 pero hay ' + countTotal + ' ✗✗✗');
}

console.log('\n=== FIN ===');
