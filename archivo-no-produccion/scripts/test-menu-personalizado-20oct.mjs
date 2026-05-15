import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env manualmente
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

const fecha = '2025-10-20';
const diaSemana = 1; // Lunes

console.log('=== TEST MENÚ PERSONALIZADO 20 OCTUBRE 2025 ===\n');

// 1. Verificar menús personalizados
console.log('1. Consultando menús personalizados para', fecha);
const { data: elecciones, error: errorElecciones } = await supabase
  .from('comedor_menupersonalizado')
  .select(`
    *,
    hijo_details:hijos(nombre, grado:grados(nombre)),
    padre:padres(nombre, es_personal),
    opcion_principal:opciones_menu_principal(nombre),
    opcion_guarnicion:opciones_menu_guarnicion(nombre)
  `)
  .eq('fecha', fecha);

if (errorElecciones) {
  console.error('Error:', errorElecciones);
} else {
  console.log('Elecciones encontradas:', elecciones.length);
  elecciones.forEach(e => {
    console.log('  -', e.hijo_details?.nombre || e.padre?.nombre);
    console.log('    Menú:', e.opcion_principal?.nombre, '+', e.opcion_guarnicion?.nombre);
    console.log('    Datos completos:', JSON.stringify(e, null, 4));
  });
}

// 2. Verificar inscripciones para ese día
console.log('\n2. Consultando inscripciones para día', diaSemana);
const { data: inscripciones, error: errorInsc } = await supabase
  .from('comedor_inscripciones')
  .select(`
    *,
    hijo_details:hijos(
      id,
      nombre,
      grado:grados(nombre)
    )
  `)
  .eq('activo', true)
  .contains('dias_semana', [diaSemana]);

if (errorInsc) {
  console.error('Error:', errorInsc);
} else {
  console.log('Inscripciones encontradas:', inscripciones.length);

  // Buscar Laia específicamente
  const laia = inscripciones.find(i => i.hijo_details?.nombre?.includes('Laia'));
  if (laia) {
    console.log('\n  ✓ Laia encontrada en inscripciones:');
    console.log('    ID:', laia.hijo_id);
    console.log('    Nombre:', laia.hijo_details.nombre);
    console.log('    Grado:', laia.hijo_details.grado?.nombre);

    // Buscar su elección
    const eleccionLaia = elecciones?.find(e => e.hijo_id === laia.hijo_id);
    if (eleccionLaia) {
      console.log('    ✓ Tiene elección de menú:');
      console.log('      Principal:', eleccionLaia.opcion_principal?.nombre);
      console.log('      Guarnición:', eleccionLaia.opcion_guarnicion?.nombre);
    } else {
      console.log('    ✗ NO tiene elección de menú');
    }
  } else {
    console.log('  ✗ Laia NO encontrada en inscripciones');
  }
}

// 3. Verificar bajas
console.log('\n3. Consultando bajas para', fecha);
const { data: bajas, error: errorBajas } = await supabase
  .from('comedor_bajas')
  .select(`
    *,
    hijo_details:hijos(nombre, grado:grados(nombre))
  `)
  .contains('dias', [fecha]);

if (errorBajas) {
  console.error('Error:', errorBajas);
} else {
  console.log('Bajas encontradas:', bajas.length);
  const bajaLaia = bajas.find(b => b.hijo_details?.nombre?.includes('Laia'));
  if (bajaLaia) {
    console.log('  ✗ Laia tiene BAJA para este día');
  } else {
    console.log('  ✓ Laia NO tiene baja');
  }
}

console.log('\n=== FIN TEST ===');
