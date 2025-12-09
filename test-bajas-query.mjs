import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const selectedDate = '2025-12-09';

// Convertir fecha ISO a formato español
const [year, month, day] = selectedDate.split('-');
const fechaEspanol = `${day}/${month}/${year}`;

console.log('Buscando bajas para:', selectedDate);
console.log('Formato español:', fechaEspanol);
console.log('');

// Consultar bajas antiguas (con array dias)
const { data: bajasAntiguas, error: errorAntiguas } = await supabase
  .from('comedor_bajas')
  .select(`
    *,
    hijo_details:hijos(nombre, grado:grados(nombre)),
    padre:padres(nombre)
  `)
  .contains('dias', [fechaEspanol]);

console.log('=== Bajas Antiguas (con array dias) ===');
if (errorAntiguas) {
  console.error('Error:', errorAntiguas);
} else {
  console.log('Total encontradas:', bajasAntiguas?.length || 0);
  bajasAntiguas?.forEach(b => {
    console.log(`- ID: ${b.id}`);
    console.log(`  Nombre: ${b.hijo_details?.nombre || b.padre?.nombre || b.hijo}`);
    console.log(`  Dias: ${JSON.stringify(b.dias)}`);
    console.log('');
  });
}

// Consultar bajas nuevas (con fecha_inicio/fecha_fin)
const { data: bajasNuevas, error: errorNuevas } = await supabase
  .from('comedor_bajas')
  .select(`
    *,
    hijo_details:hijos(nombre, grado:grados(nombre)),
    padre:padres(nombre)
  `)
  .lte('fecha_inicio', selectedDate)
  .gte('fecha_fin', selectedDate);

console.log('=== Bajas Nuevas (con fecha_inicio/fecha_fin) ===');
if (errorNuevas) {
  console.error('Error:', errorNuevas);
} else {
  console.log('Total encontradas:', bajasNuevas?.length || 0);
  bajasNuevas?.forEach(b => {
    console.log(`- ID: ${b.id}`);
    console.log(`  Nombre: ${b.hijo_details?.nombre || b.padre?.nombre || b.hijo}`);
    console.log(`  Fecha inicio: ${b.fecha_inicio}`);
    console.log(`  Fecha fin: ${b.fecha_fin}`);
    console.log(`  Dias: ${JSON.stringify(b.dias)}`);
    console.log(`  Hijo ID: ${b.hijo_id || 'N/A'}`);
    console.log(`  Padre ID: ${b.padre_id || 'N/A'}`);
    console.log('');
  });
}

// Combinar y ver total
const bajasMap = new Map();
[...(bajasAntiguas || []), ...(bajasNuevas || [])].forEach(b => bajasMap.set(b.id, b));
const bajas = Array.from(bajasMap.values());

console.log('=== Total Combinado ===');
console.log('Total de bajas:', bajas.length);
