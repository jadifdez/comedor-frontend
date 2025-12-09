import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAlta() {
  console.log('🧪 Probando crear alta puntual manualmente...\n');

  // Obtener un hijo para probar
  const { data: hijos, error: errorHijos } = await supabase
    .from('hijos')
    .select('id, nombre, grado:grados(nombre)')
    .limit(1)
    .maybeSingle();

  if (errorHijos || !hijos) {
    console.error('❌ Error al obtener hijo:', errorHijos);
    return;
  }

  console.log(`📝 Usando hijo: ${hijos.nombre} (ID: ${hijos.id})\n`);

  // Simular lo que hace el código del frontend
  const fechaISO = '2025-12-09';
  const date = new Date(fechaISO);
  const fechaFormateada = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  console.log(`📅 Fecha ISO: ${fechaISO}`);
  console.log(`📅 Fecha formateada: ${fechaFormateada}\n`);

  const altaData = {
    hijo: hijos.nombre,
    hijo_id: hijos.id,
    curso: hijos.grado?.nombre || '',
    fecha: fechaFormateada,
    estado: 'aprobada'
  };

  console.log('📋 Datos a insertar:', altaData, '\n');

  const { data, error } = await supabase
    .from('comedor_altaspuntuales')
    .insert([altaData])
    .select('*');

  if (error) {
    console.error('❌ Error al insertar:', error);
    return;
  }

  console.log('✅ Alta puntual creada correctamente:');
  console.log(data);

  // Ahora buscar como lo hace el frontend
  console.log('\n🔍 Buscando el alta recién creada...');
  const { data: found, error: errorFound } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .eq('fecha', fechaFormateada)
    .eq('estado', 'aprobada');

  if (errorFound) {
    console.error('❌ Error al buscar:', errorFound);
    return;
  }

  console.log(`✅ Altas encontradas: ${found.length}`);
  if (found.length > 0) {
    console.log('Primera alta encontrada:', found[0]);
  }
}

testAlta();
