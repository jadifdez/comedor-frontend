import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testFullFlow() {
  console.log('🧪 Test completo del flujo de alta puntual\n');

  // Paso 1: Buscar el alumno Torres Luna
  console.log('📋 Paso 1: Buscar alumno Torres Luna...');
  const { data: alumnos, error: errorAlumnos } = await supabase
    .from('hijos')
    .select('id, nombre, grado:grados(nombre)')
    .ilike('nombre', '%Torres%Luna%')
    .limit(5);

  if (errorAlumnos) {
    console.error('❌ Error buscando alumno:', errorAlumnos);
    return;
  }

  console.log(`✅ Encontrados ${alumnos?.length || 0} alumnos:`);
  alumnos?.forEach(a => console.log(`   - ${a.nombre} (${a.id})`));
  console.log('');

  if (!alumnos || alumnos.length === 0) {
    console.log('⚠️  No se encontró ningún alumno con ese nombre');
    return;
  }

  const alumno = alumnos[0];
  console.log(`✅ Usando: ${alumno.nombre}\n`);

  // Paso 2: Formatear la fecha como lo hace el frontend
  const fechaISO = '2025-12-09';
  const date = new Date(fechaISO + 'T00:00:00');
  const fechaFormateada = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  console.log('📅 Paso 2: Formatear fecha');
  console.log(`   Fecha ISO: ${fechaISO}`);
  console.log(`   Fecha formateada: ${fechaFormateada}\n`);

  // Paso 3: Verificar si ya existe un alta puntual para este alumno en esta fecha
  console.log('🔍 Paso 3: Verificar altas existentes...');
  const { data: altasExistentes, error: errorCheck } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .eq('hijo_id', alumno.id)
    .eq('fecha', fechaFormateada);

  if (errorCheck) {
    console.error('❌ Error verificando altas:', errorCheck);
    return;
  }

  console.log(`   Altas existentes: ${altasExistentes?.length || 0}`);
  if (altasExistentes && altasExistentes.length > 0) {
    console.log('   ⚠️  Ya existe un alta para este alumno en esta fecha');
    altasExistentes.forEach(a => console.log(`      - Estado: ${a.estado}, Fecha: ${a.fecha}`));
  }
  console.log('');

  // Paso 4: Buscar con el método que usa useDailyManagement
  console.log('🔍 Paso 4: Buscar como lo hace useDailyManagement...');
  const { data: altasFound, error: errorFound } = await supabase
    .from('comedor_altaspuntuales')
    .select(`
      *,
      hijo:hijos(id, nombre, grado:grados(nombre)),
      padre:padres(id, nombre, es_personal)
    `)
    .eq('fecha', fechaFormateada)
    .eq('estado', 'aprobada');

  if (errorFound) {
    console.error('❌ Error en búsqueda:', errorFound);
    return;
  }

  console.log(`✅ Altas puntuales encontradas con JOIN: ${altasFound?.length || 0}`);
  if (altasFound && altasFound.length > 0) {
    altasFound.forEach(a => {
      console.log(`   - ${a.hijo?.nombre || a.padre?.nombre || 'Desconocido'}`);
      console.log(`     Fecha: ${a.fecha}, Estado: ${a.estado}`);
    });
  } else {
    console.log('   ⚠️  No se encontraron altas puntuales para esta fecha');
  }
  console.log('');

  console.log('✅ Test completado');
}

testFullFlow();
