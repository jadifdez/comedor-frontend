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
  env.VITE_SUPABASE_ANON_KEY
);

console.log('=== GENERAR COMANDOS SQL PARA INSERTAR EN LOTES ===\n');

const borrame1Id = 'e3d1ce47-4970-49f8-8edf-baac57ad2638';

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
console.log('Total fechas: ' + fechas.length);

// Dividir en lotes de 50
const BATCH_SIZE = 50;
const numLotes = Math.ceil(fechas.length / BATCH_SIZE);

console.log('Lotes a generar: ' + numLotes + '\n');

for (let i = 0; i < numLotes; i++) {
  const start = i * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, fechas.length);
  const lote = fechas.slice(start, end);
  
  console.log('-- LOTE ' + (i + 1) + ' de ' + numLotes + ' (' + lote.length + ' registros)');
  console.log('INSERT INTO invitaciones_comedor (fecha, hijo_id, padre_id, nombre_completo, motivo, created_by)');
  console.log('VALUES');
  
  const values = lote.map((fecha, idx) => {
    const isLast = idx === lote.length - 1;
    return `  ('${fecha}', '${borrame1Id}', NULL, NULL, 'Invitación anual 2025', '00000000-0000-0000-0000-000000000000')${isLast ? ';' : ','}`;
  });
  
  console.log(values.join('\n'));
  console.log('');
}

console.log('-- FIN --');
