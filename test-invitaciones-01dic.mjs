import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testInvitaciones() {
  const selectedDate = '2025-12-01';
  const date = new Date(selectedDate + 'T00:00:00');
  const diaSemana = date.getDay();

  console.log('Fecha:', selectedDate);
  console.log('Día de la semana:', diaSemana);
  console.log('\n--- PASO 1: Obtener invitaciones ---');

  const { data: invitaciones, error: invError } = await supabase
    .from('invitaciones_comedor')
    .select(`
      *,
      hijo:hijos(id, nombre, grado:grados(nombre)),
      padre:padres(id, nombre, es_personal)
    `)
    .eq('fecha', selectedDate);

  if (invError) {
    console.error('Error:', invError);
    return;
  }

  console.log('Total invitaciones:', invitaciones.length);
  console.log('Invitaciones por tipo:');
  console.log('- Hijos:', invitaciones.filter(i => i.hijo_id).length);
  console.log('- Padres:', invitaciones.filter(i => i.padre_id).length);
  console.log('- Externos:', invitaciones.filter(i => !i.hijo_id && !i.padre_id).length);

  console.log('\n--- PASO 2: Obtener inscripciones de padres ---');

  const { data: inscripcionesPadreRaw, error: inscError } = await supabase
    .from('comedor_inscripciones_padres')
    .select(`
      *,
      padre:padres(
        id,
        nombre,
        es_personal
      )
    `)
    .eq('activo', true)
    .contains('dias_semana', [diaSemana]);

  if (inscError) {
    console.error('Error:', inscError);
    return;
  }

  console.log('Total inscripciones padres (pre-filtro):', inscripcionesPadreRaw.length);

  // Filtrar por fecha
  const inscripcionesPadre = inscripcionesPadreRaw.filter(insc => {
    const fechaInicio = new Date(insc.fecha_inicio);
    const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin) : null;
    const fechaSeleccionada = new Date(selectedDate);

    return fechaInicio <= fechaSeleccionada &&
           (!fechaFin || fechaFin >= fechaSeleccionada);
  });

  console.log('Total inscripciones padres (post-filtro):', inscripcionesPadre.length);

  console.log('\n--- PASO 3: Crear mapa de invitaciones ---');

  const invitacionesMap = new Map();
  invitaciones.forEach(inv => {
    const key = inv.hijo_id ? `hijo_${inv.hijo_id}` : inv.padre_id ? `padre_${inv.padre_id}` : `externo_${inv.id}`;
    invitacionesMap.set(key, inv);
  });

  console.log('Claves en mapa de invitaciones:', Array.from(invitacionesMap.keys()).slice(0, 5));

  console.log('\n--- PASO 4: Procesar inscritos con invitaciones ---');

  let conteoInvitados = 0;
  inscripcionesPadre.forEach(insc => {
    const key = `padre_${insc.padre_id}`;
    const invitacion = invitacionesMap.get(key);

    if (invitacion) {
      conteoInvitados++;
      if (conteoInvitados <= 3) {
        console.log(`✓ ${insc.padre?.nombre}: tiene invitación (${invitacion.motivo})`);
      }
    }
  });

  console.log(`\nTotal inscritos con invitación: ${conteoInvitados}`);

  console.log('\n--- PASO 5: Invitaciones sin inscripción ---');

  let invitadosSinInscripcion = 0;
  invitaciones.forEach(inv => {
    if (inv.padre_id) {
      const yaInscrito = inscripcionesPadre.find(insc => insc.padre_id === inv.padre_id);
      if (!yaInscrito) {
        invitadosSinInscripcion++;
        console.log(`- ${inv.padre?.nombre}: invitado pero NO inscrito`);
      }
    }
  });

  console.log(`Total invitados sin inscripción: ${invitadosSinInscripcion}`);

  console.log('\n=== RESUMEN ===');
  console.log(`Invitaciones totales: ${invitaciones.length}`);
  console.log(`Inscritos con invitación: ${conteoInvitados}`);
  console.log(`Invitados sin inscripción: ${invitadosSinInscripcion}`);
}

testInvitaciones().catch(console.error);
