import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Convierte una fecha ISO (YYYY-MM-DD) al formato español (DD/MM/YYYY)
 */
function formatearFechaEspanol(fechaISO) {
  const [year, month, day] = fechaISO.split('-');
  return `${day}/${month}/${year}`;
}

console.log('=== MIGRANDO CANCELACIONES A BAJAS ===\n');

// 1. Consultar todas las cancelaciones
const { data: cancelaciones, error: errorConsulta } = await supabase
  .from('comedor_cancelaciones_ultimo_momento')
  .select('*')
  .order('fecha', { ascending: true });

if (errorConsulta) {
  console.error('❌ Error al consultar cancelaciones:', errorConsulta);
  process.exit(1);
}

if (!cancelaciones || cancelaciones.length === 0) {
  console.log('✅ No hay cancelaciones que migrar.');
  process.exit(0);
}

console.log(`📊 Encontradas ${cancelaciones.length} cancelaciones\n`);

let migradas = 0;
let errores = 0;
const detalles = [];

// 2. Migrar cada cancelación
for (const cancelacion of cancelaciones) {
  try {
    let hijoNombre = null;
    let curso = null;

    // Obtener datos del hijo o del padre
    if (cancelacion.hijo_id) {
      const { data: hijo, error: errorHijo } = await supabase
        .from('hijos')
        .select('nombre, grado:grados(nombre)')
        .eq('id', cancelacion.hijo_id)
        .maybeSingle();

      if (errorHijo) {
        console.error(`⚠️  Error al obtener datos del hijo ${cancelacion.hijo_id}:`, errorHijo);
        errores++;
        continue;
      }

      if (!hijo) {
        console.error(`⚠️  No se encontró el hijo ${cancelacion.hijo_id}`);
        errores++;
        continue;
      }

      hijoNombre = hijo.nombre;
      curso = hijo.grado?.nombre || 'Sin curso';
    } else if (cancelacion.padre_id) {
      const { data: padre, error: errorPadre } = await supabase
        .from('padres')
        .select('nombre')
        .eq('id', cancelacion.padre_id)
        .maybeSingle();

      if (errorPadre) {
        console.error(`⚠️  Error al obtener datos del padre ${cancelacion.padre_id}:`, errorPadre);
        errores++;
        continue;
      }

      if (!padre) {
        console.error(`⚠️  No se encontró el padre ${cancelacion.padre_id}`);
        errores++;
        continue;
      }

      hijoNombre = padre.nombre;
      curso = 'Personal del colegio';
    } else {
      console.error('⚠️  Cancelación sin hijo_id ni padre_id:', cancelacion);
      errores++;
      continue;
    }

    // Convertir fecha a formato español
    const fechaEspanol = formatearFechaEspanol(cancelacion.fecha);

    // Crear registro en comedor_bajas
    const nuevaBaja = {
      hijo: hijoNombre,
      curso: curso,
      dias: [fechaEspanol],
      motivo_baja: cancelacion.motivo || 'Cancelación de último momento',
      hijo_id: cancelacion.hijo_id || null,
      padre_id: cancelacion.padre_id || null,
      user_id: cancelacion.cancelado_por || null,
      fecha_creacion: cancelacion.created_at || new Date().toISOString()
    };

    const { error: errorInsert } = await supabase
      .from('comedor_bajas')
      .insert(nuevaBaja);

    if (errorInsert) {
      console.error(`❌ Error al insertar baja para ${hijoNombre}:`, errorInsert);
      errores++;
    } else {
      migradas++;
      detalles.push({
        nombre: hijoNombre,
        fecha: fechaEspanol,
        curso: curso
      });
      console.log(`✅ Migrada: ${hijoNombre} - ${fechaEspanol} - ${curso}`);
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err);
    errores++;
  }
}

console.log('\n=== RESUMEN DE MIGRACIÓN ===');
console.log(`Total cancelaciones: ${cancelaciones.length}`);
console.log(`✅ Migradas exitosamente: ${migradas}`);
console.log(`❌ Errores: ${errores}`);

if (migradas > 0) {
  console.log('\n=== DETALLES DE MIGRACIONES ===');
  detalles.forEach(d => {
    console.log(`  ${d.nombre} (${d.curso}) - ${d.fecha}`);
  });
}

console.log('\n💡 SIGUIENTE PASO:');
console.log('Si la migración fue exitosa, puedes eliminar los registros de comedor_cancelaciones_ultimo_momento');
console.log('ejecutando: node eliminar-cancelaciones-migradas.mjs');
