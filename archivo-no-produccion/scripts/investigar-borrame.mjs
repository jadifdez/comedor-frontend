import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aayyvcxthpzcpputenwh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheXl2Y3h0aHB6Y3BwdXRlbndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDk4MDMsImV4cCI6MjA3NzM4NTgwM30.EuOHkGoiPNlyMx_skZ9urvh8sBoWJH_4X60Kp4BpWQg'
);

console.log('=== INVESTIGACIÓN: Alumnos borrame1, borrame2, borrame3 ===\n');

// Buscar los hijos
const { data: hijos, error: hijosError } = await supabase
  .from('hijos')
  .select('*')
  .or('nombre.ilike.%borrame1%,nombre.ilike.%borrame2%,nombre.ilike.%borrame3%');

if (hijosError) {
  console.error('Error buscando hijos:', hijosError);
  process.exit(1);
}

if (!hijos || hijos.length === 0) {
  console.log('No se encontraron hijos con esos nombres');
  process.exit(0);
}

console.log(`Encontrados ${hijos.length} alumnos:\n`);

for (const hijo of hijos) {
  console.log(`\n========================================`);
  console.log(`ALUMNO: ${hijo.nombre}`);
  console.log(`ID: ${hijo.id}`);
  console.log(`Activo: ${hijo.activo}`);
  console.log(`========================================\n`);

  // Buscar TODAS las inscripciones de este hijo
  const { data: inscripciones, error: inscError } = await supabase
    .from('comedor_inscripciones')
    .select('*')
    .eq('hijo_id', hijo.id)
    .order('created_at', { ascending: false });

  if (inscError) {
    console.error('Error buscando inscripciones:', inscError);
    continue;
  }

  console.log(`Total de inscripciones: ${inscripciones?.length || 0}\n`);

  if (inscripciones && inscripciones.length > 0) {
    inscripciones.forEach((insc, index) => {
      console.log(`--- Inscripción ${index + 1} ---`);
      console.log(`  ID: ${insc.id}`);
      console.log(`  Estado: ${insc.activo ? '✓ ACTIVA' : '✗ DESACTIVADA'}`);
      console.log(`  Fecha inicio: ${insc.fecha_inicio}`);
      console.log(`  Fecha fin: ${insc.fecha_fin || 'SIN FECHA FIN (abierta)'}`);
      console.log(`  Días semana: ${JSON.stringify(insc.dias_semana)}`);
      console.log(`  Precio diario: ${insc.precio_diario}€`);
      console.log(`  Descuento aplicado: ${insc.descuento_aplicado || 0}%`);
      console.log(`  Creada: ${insc.created_at}`);
      console.log('');
    });

    // Verificar qué inscripción se incluiría con la consulta actual
    const mesActual = new Date();
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth() + 1;
    const ultimoDiaMes = new Date(year, month, 0).getDate();
    const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
    const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

    console.log(`\n🔍 ANÁLISIS PARA EL MES ACTUAL (${year}-${String(month).padStart(2, '0')}):`);
    console.log(`Rango del mes: ${fechaInicioMes} - ${fechaFinMes}\n`);

    // Simular la consulta que hace el sistema
    const queryStr = `and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`;
    const { data: inscripcionesConsulta } = await supabase
      .from('comedor_inscripciones')
      .select('*')
      .eq('hijo_id', hijo.id)
      .or(queryStr);

    console.log(`Inscripciones que se incluirían en facturación: ${inscripcionesConsulta?.length || 0}`);
    
    if (inscripcionesConsulta && inscripcionesConsulta.length > 0) {
      inscripcionesConsulta.forEach(insc => {
        console.log(`  ✓ ID: ${insc.id.substring(0, 8)}... (${insc.activo ? 'ACTIVA' : 'DESACTIVADA'})`);
        console.log(`    Rango: ${insc.fecha_inicio} → ${insc.fecha_fin || 'abierta'}`);
      });
    } else {
      console.log('  ✗ Ninguna inscripción se incluiría');
    }

    // Analizar por qué
    console.log('\n📋 DIAGNÓSTICO:');
    for (const insc of inscripciones) {
      const cumpleActiva = insc.activo && insc.fecha_inicio <= fechaFinMes;
      const cumpleDesactivada = !insc.activo && insc.fecha_fin && 
                                 insc.fecha_fin >= fechaInicioMes && 
                                 insc.fecha_fin <= fechaFinMes;
      
      console.log(`\nInscripción ${insc.id.substring(0, 8)}...:`);
      console.log(`  Estado: ${insc.activo ? 'ACTIVA' : 'DESACTIVADA'}`);
      
      if (insc.activo) {
        console.log(`  Condición "activa": activo=true ✓ AND fecha_inicio (${insc.fecha_inicio}) <= ${fechaFinMes}: ${cumpleActiva ? '✓' : '✗'}`);
        if (!cumpleActiva) {
          console.log(`  ❌ NO SE INCLUYE: La fecha de inicio es posterior al mes actual`);
        } else {
          console.log(`  ✓ SE INCLUYE en facturación`);
        }
      } else {
        console.log(`  Condición "desactivada": activo=false ✓ AND fecha_fin (${insc.fecha_fin || 'null'}) >= ${fechaInicioMes} AND <= ${fechaFinMes}: ${cumpleDesactivada ? '✓' : '✗'}`);
        if (!cumpleDesactivada) {
          if (!insc.fecha_fin) {
            console.log(`  ❌ NO SE INCLUYE: No tiene fecha_fin`);
          } else if (insc.fecha_fin < fechaInicioMes) {
            console.log(`  ❌ NO SE INCLUYE: La fecha_fin es anterior al mes actual`);
          } else if (insc.fecha_fin > fechaFinMes) {
            console.log(`  ❌ NO SE INCLUYE: La fecha_fin es posterior al mes actual`);
          }
        } else {
          console.log(`  ✓ SE INCLUYE en facturación`);
        }
      }
    }
  }
}

console.log('\n\n=== FIN DE LA INVESTIGACIÓN ===');
