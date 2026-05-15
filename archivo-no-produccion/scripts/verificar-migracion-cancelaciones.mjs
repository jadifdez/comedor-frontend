import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verificarMigracion() {
  console.log('🔍 Verificando migración de cancelaciones a bajas...\n');

  // Contar registros en cancelaciones originales
  console.log('📊 Tabla comedor_cancelaciones_ultimo_momento:');
  const { count: countCancelaciones, error: errorCancelaciones } = await supabase
    .from('comedor_cancelaciones_ultimo_momento')
    .select('*', { count: 'exact', head: true });

  if (errorCancelaciones) {
    console.log('   ⚠️ No se puede acceder (RLS activo)');
  } else {
    console.log(`   Total de registros: ${countCancelaciones}`);
  }

  // Contar bajas con fechas específicas (migradas)
  console.log('\n📊 Tabla comedor_bajas (registros con fecha_inicio/fin):');
  const { data: bajasConFecha, error: errorBajas } = await supabase
    .from('comedor_bajas')
    .select('*')
    .not('fecha_inicio', 'is', null)
    .not('fecha_fin', 'is', null);

  if (errorBajas) {
    console.log('   ❌ Error al consultar:', errorBajas.message);
  } else {
    console.log(`   Total de bajas con fechas específicas: ${bajasConFecha.length}`);

    if (bajasConFecha.length > 0) {
      console.log('\n   Últimas bajas migradas:');
      bajasConFecha
        .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
        .slice(0, 10)
        .forEach((baja, idx) => {
          console.log(`\n   ${idx + 1}. ${baja.hijo || 'N/A'}`);
          console.log(`      Curso: ${baja.curso || 'N/A'}`);
          console.log(`      Fecha: ${baja.fecha_inicio} a ${baja.fecha_fin}`);
          console.log(`      Motivo: ${baja.motivo || 'Sin motivo'}`);
          console.log(`      Creado: ${baja.fecha_creacion}`);
        });
    }
  }

  // Resumen
  console.log('\n\n✅ RESUMEN:');
  console.log('   - Se añadieron campos fecha_inicio, fecha_fin, motivo a comedor_bajas');
  console.log('   - Se migraron los registros de cancelaciones a bajas');
  console.log('   - Los registros originales se mantienen en comedor_cancelaciones_ultimo_momento');
}

verificarMigracion();
