import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Simular autenticación como admin (necesitas las credenciales reales)
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'administracion@hofi.com',
  password: 'Hofi1234'
});

if (authError) {
  console.error('Error al autenticar:', authError.message);
  process.exit(1);
}

console.log('Autenticado como:', authData.user.email);
console.log('');

const selectedDate = '2025-12-09';
const [year, month, day] = selectedDate.split('-');
const fechaEspanol = `${day}/${month}/${year}`;

console.log('Buscando bajas para:', selectedDate, '(', fechaEspanol, ')');
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
  if (bajasAntiguas && bajasAntiguas.length > 0) {
    bajasAntiguas.slice(0, 3).forEach(b => {
      console.log(`- ${b.hijo_details?.nombre || b.hijo}`);
      console.log(`  hijo_id: ${b.hijo_id}`);
    });
  }
}
console.log('');

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
}
console.log('');

// Combinar
const bajasMap = new Map();
[...(bajasAntiguas || []), ...(bajasNuevas || [])].forEach(b => bajasMap.set(b.id, b));
const bajas = Array.from(bajasMap.values());

console.log('=== Total Combinado ===');
console.log('Total de bajas únicas:', bajas.length);
console.log('');

// Crear mapa de bajas por hijo_id
const bajasHijosMap = new Map();
bajas.forEach(b => {
  if (b.hijo_id) {
    bajasHijosMap.set(b.hijo_id, b.id);
  }
});

console.log('=== Mapa de Bajas por hijo_id ===');
console.log('Total hijos con bajas:', bajasHijosMap.size);
console.log('');

// Probar con un hijo específico
const hijoIdPrueba = 'f8b83db1-7231-4b6d-8381-e9d2ac653cf9'; // Canas López, Tessa
console.log('Verificando baja para hijo_id:', hijoIdPrueba);
console.log('Tiene baja:', bajasHijosMap.has(hijoIdPrueba));
console.log('ID de baja:', bajasHijosMap.get(hijoIdPrueba));

await supabase.auth.signOut();
