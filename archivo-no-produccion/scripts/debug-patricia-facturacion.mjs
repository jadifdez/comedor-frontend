import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debug() {
  console.log('=== DEBUG: FACTURACIÓN PATRICIA ALMAGRO ===\n');

  // Paso 1: Buscar a Patricia
  console.log('PASO 1: Buscando a Patricia...');
  const { data: patricia, error: errorPadre } = await supabase
    .from('padres')
    .select('*')
    .ilike('nombre', '%almagro%patricia%')
    .maybeSingle();

  if (errorPadre || !patricia) {
    console.log('❌ Error o no encontrada:', errorPadre);
    return;
  }

  console.log('✓ Patricia encontrada:');
  console.log('  ID:', patricia.id);
  console.log('  Nombre:', patricia.nombre);
  console.log('  Email:', patricia.email);
  console.log('  es_personal:', patricia.es_personal);
  console.log('  activo:', patricia.activo);
  console.log('');

  // Paso 2: Buscar inscripciones de Patricia como PADRE
  console.log('PASO 2: Buscando inscripciones de comedor de Patricia (como personal)...');
  const { data: inscripcionesPadre, error: errorInscPadre } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .eq('padre_id', patricia.id);

  if (errorInscPadre) {
    console.log('❌ Error buscando inscripciones:', errorInscPadre);
    return;
  }

  console.log('✓ Inscripciones encontradas:', inscripcionesPadre?.length || 0);
  if (inscripcionesPadre && inscripcionesPadre.length > 0) {
    inscripcionesPadre.forEach((insc, idx) => {
      console.log(`  [${idx + 1}]:`, {
        id: insc.id,
        dias_semana: insc.dias_semana,
        precio_diario: insc.precio_diario,
        activo: insc.activo,
        fecha_inicio: insc.fecha_inicio,
        fecha_fin: insc.fecha_fin
      });
    });
  }
  console.log('');

  // Paso 3: Simular el query de facturación para diciembre 2025
  console.log('PASO 3: Simulando query de facturación para diciembre 2025...');
  const mesSeleccionado = '2025-12';
  const [year, month] = mesSeleccionado.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

  console.log('  Rango de fechas:', fechaInicioMes, '-', fechaFinMes);

  const { data: inscripcionesMes, error: errorMes } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .or(`and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`);

  if (errorMes) {
    console.log('❌ Error en query de mes:', errorMes);
  } else {
    console.log('✓ Total inscripciones para el mes:', inscripcionesMes?.length || 0);
    const patriciaEnMes = inscripcionesMes?.filter(i => i.padre_id === patricia.id) || [];
    console.log('  Inscripciones de Patricia en el mes:', patriciaEnMes.length);
    if (patriciaEnMes.length > 0) {
      console.log('  Detalles:', patriciaEnMes[0]);
    } else {
      console.log('  ⚠️  Patricia NO está en las inscripciones del mes');
    }
  }
  console.log('');

  // Paso 4: Buscar hijos de Patricia
  console.log('PASO 4: Buscando hijos de Patricia...');
  const { data: hijos, error: errorHijos } = await supabase
    .from('hijos')
    .select('*')
    .eq('padre_id', patricia.id)
    .eq('activo', true);

  if (errorHijos) {
    console.log('❌ Error buscando hijos:', errorHijos);
  } else {
    console.log('✓ Hijos encontrados:', hijos?.length || 0);
    if (hijos && hijos.length > 0) {
      hijos.forEach(hijo => {
        console.log('  -', hijo.nombre);
      });
    }
  }
  console.log('');

  // Paso 5: Verificar días laborables de diciembre
  console.log('PASO 5: Calculando días laborables de diciembre 2025...');

  // Calcular mes siguiente correctamente
  const siguienteMes = month === 12 ? 1 : month + 1;
  const siguienteAño = month === 12 ? year + 1 : year;

  const { data: diasFestivos, error: errorFestivos } = await supabase
    .from('dias_festivos')
    .select('fecha')
    .eq('activo', true)
    .gte('fecha', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('fecha', `${siguienteAño}-${String(siguienteMes).padStart(2, '0')}-01`);

  if (errorFestivos) {
    console.log('❌ Error cargando festivos:', errorFestivos);
  } else {
    console.log('✓ Días festivos en diciembre:', diasFestivos?.length || 0);
    if (diasFestivos && diasFestivos.length > 0) {
      diasFestivos.forEach(f => console.log('  -', f.fecha));
    }
  }

  const diasEnMes = new Date(year, month, 0).getDate();
  const festivosSet = new Set(diasFestivos?.map(d => d.fecha) || []);
  const diasLaborables = [];

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay();
    const fechaStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    if (diaSemana >= 1 && diaSemana <= 5 && !festivosSet.has(fechaStr)) {
      diasLaborables.push(fechaStr);
    }
  }

  console.log('  Total días laborables:', diasLaborables.length);
  console.log('');

  // Paso 6: Verificar qué días de Patricia deberían facturarse
  if (inscripcionesPadre && inscripcionesPadre.length > 0) {
    const insc = inscripcionesPadre[0];
    console.log('PASO 6: Calculando días facturables para Patricia...');
    console.log('  Días inscripción:', insc.dias_semana, '(Lun-Jue)');

    let diasFacturables = 0;
    const ejemplosDias = [];

    for (const fecha of diasLaborables) {
      const fechaDate = new Date(fecha);
      const diaSemana = fechaDate.getDay();
      const fechaInicio = new Date(insc.fecha_inicio);
      const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin) : null;

      const cumpleInscripcion = insc.dias_semana.includes(diaSemana) &&
        fechaDate >= fechaInicio &&
        (!fechaFin || fechaDate <= fechaFin);

      if (cumpleInscripcion) {
        diasFacturables++;
        if (ejemplosDias.length < 3) {
          ejemplosDias.push(`${fecha} (día ${diaSemana})`);
        }
      }
    }

    console.log('  Días que deberían facturarse:', diasFacturables);
    console.log('  Ejemplos:', ejemplosDias);
    console.log('  Total a facturar:', (diasFacturables * parseFloat(insc.precio_diario)).toFixed(2), '€');
  }
}

debug();
