import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer archivo .env manualmente
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

// Usar service_role para bypasear RLS en el test
console.log('URL:', env.VITE_SUPABASE_URL ? 'OK' : 'MISSING');
console.log('SERVICE_ROLE_KEY:', env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

const laiaId = '3ef6e429-2c24-42eb-971b-4ea972b0c1bf';
const padreId = '3c8020e8-10a1-4fb6-b894-ad21e359a844'; // Javier Mateo
const year = 2025;
const month = 10;

// Función para obtener días laborables
function getDiasLaborablesMes(year, month) {
  const dias = [];
  const primerDia = new Date(year, month - 1, 1);
  const ultimoDia = new Date(year, month, 0);

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay();

    // Solo lunes a viernes (1-5)
    if (diaSemana >= 1 && diaSemana <= 5) {
      const fechaStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      dias.push(fechaStr);
    }
  }

  return dias;
}

// Función para verificar si una fecha tiene invitación
function tieneInvitacion(fecha, invitaciones) {
  return invitaciones.some(inv => inv.fecha === fecha);
}

// Función para verificar si tiene baja
function tieneBaja(fecha, bajas) {
  for (const baja of bajas) {
    for (const diaStr of baja.dias) {
      // Convertir formato DD/MM/YYYY a YYYY-MM-DD
      const parts = diaStr.split('/');
      if (parts.length === 3) {
        const fechaBaja = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (fechaBaja === fecha) {
          return true;
        }
      }
    }
  }
  return false;
}

// Función para verificar inscripción
function estaEnRangoInscripcion(fecha, inscripcion) {
  const fechaDate = new Date(fecha);
  const diaSemana = fechaDate.getDay();
  const fechaInicio = new Date(inscripcion.fecha_inicio);
  const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;

  return (
    inscripcion.dias_semana.includes(diaSemana) &&
    fechaDate >= fechaInicio &&
    (!fechaFin || fechaDate <= fechaFin)
  );
}

async function analizarLaia() {
  console.log('=== ANÁLISIS DE LAIA - OCTUBRE 2025 ===\n');

  const fechaInicio = '2025-10-01';
  const fechaFin = '2025-10-31';

  // Obtener datos tal como lo hace useFacturacion
  const [hijosRes, inscripcionesRes, bajasRes, solicitudesRes, invitacionesRes, festivosRes] = await Promise.all([
    supabase
      .from('hijos')
      .select('*, grado:grados(*)')
      .eq('id', laiaId)
      .maybeSingle(),

    supabase
      .from('comedor_inscripciones')
      .select('*')
      .eq('hijo_id', laiaId)
      .eq('activo', true),

    supabase
      .from('comedor_bajas')
      .select('*')
      .order('fecha_creacion'),

    supabase
      .from('comedor_altaspuntuales')
      .select('*')
      .eq('estado', 'aprobada')
      .order('fecha_creacion'),

    supabase
      .from('invitaciones_comedor')
      .select('*')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin),

    supabase
      .from('dias_festivos')
      .select('fecha')
      .eq('activo', true)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
  ]);

  const hijo = hijosRes.data;
  const inscripciones = inscripcionesRes.data || [];
  const todasBajas = bajasRes.data || [];
  const todasSolicitudes = solicitudesRes.data || [];
  const todasInvitaciones = invitacionesRes.data || [];
  const festivos = new Set((festivosRes.data || []).map(f => f.fecha));

  // Debug: ver qué devolvió la query
  console.log('DEBUG - Total inscripciones encontradas:', inscripciones.length);
  console.log('DEBUG - Inscripciones:', JSON.stringify(inscripciones, null, 2));

  // Filtrar por hijo específico
  const inscripcion = inscripciones.find(i => i.hijo_id === laiaId && i.activo);
  const bajas = todasBajas.filter(b => b.hijo_id === laiaId);
  const solicitudes = todasSolicitudes.filter(s => s.hijo_id === laiaId);
  const invitaciones = todasInvitaciones.filter(i => i.hijo_id === laiaId);

  console.log('Inscripción:', inscripcion ? `Lunes-Jueves (días ${inscripcion.dias_semana})` : 'No tiene');
  console.log('Invitaciones encontradas:', invitaciones.length);
  invitaciones.forEach(inv => console.log(`  - ${inv.fecha}: ${inv.motivo}`));
  console.log('Bajas encontradas:', bajas.length);
  bajas.forEach(baja => console.log(`  - Días:`, baja.dias));
  console.log('Solicitudes puntuales:', solicitudes.length);
  solicitudes.forEach(sol => console.log(`  - ${sol.fecha}: ${sol.estado}`));
  console.log('Festivos:', Array.from(festivos).join(', '));
  console.log('\n=== PROCESANDO DÍAS ===\n');

  const diasLaborables = getDiasLaborablesMes(year, month);

  let diasInscripcion = 0;
  let diasFacturables = 0;
  let diasInvitacion = 0;
  let diasBaja = 0;
  let diasPuntuales = 0;
  let diasFestivos = 0;

  const detalleFacturables = [];

  for (const fecha of diasLaborables) {
    const fechaDate = new Date(fecha);
    const diaSemanaNum = fechaDate.getDay();
    const diaSemanaStr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][diaSemanaNum];

    // Verificar invitación (prioridad máxima)
    if (tieneInvitacion(fecha, invitaciones)) {
      diasInvitacion++;
      if (inscripcion && estaEnRangoInscripcion(fecha, inscripcion)) {
        diasInscripcion++;
      }
      console.log(`${fecha} (${diaSemanaStr}): INVITACIÓN - NO se factura`);
      continue;
    }

    // Verificar festivo
    if (festivos.has(fecha)) {
      diasFestivos++;
      if (inscripcion && estaEnRangoInscripcion(fecha, inscripcion)) {
        diasInscripcion++;
      }
      console.log(`${fecha} (${diaSemanaStr}): FESTIVO - NO se factura`);
      continue;
    }

    // Verificar baja
    if (tieneBaja(fecha, bajas)) {
      diasBaja++;
      console.log(`${fecha} (${diaSemanaStr}): BAJA - NO se factura`);
      continue;
    }

    // Verificar puntual
    const puntual = solicitudes.find(s => s.fecha === fecha);
    if (puntual) {
      diasPuntuales++;
      diasFacturables++;
      detalleFacturables.push(fecha);
      console.log(`${fecha} (${diaSemanaStr}): PUNTUAL - SÍ se factura`);
      continue;
    }

    // Verificar inscripción
    if (inscripcion && estaEnRangoInscripcion(fecha, inscripcion)) {
      diasInscripcion++;
      diasFacturables++;
      detalleFacturables.push(fecha);
      console.log(`${fecha} (${diaSemanaStr}): INSCRIPCIÓN - SÍ se factura`);
    } else {
      console.log(`${fecha} (${diaSemanaStr}): Sin servicio`);
    }
  }

  console.log('\n=== RESUMEN ===\n');
  console.log('Total días laborables del mes:', diasLaborables.length);
  console.log('Días según calendario (inscripción):', diasInscripcion);
  console.log('Días festivos:', diasFestivos);
  console.log('Días con invitación:', diasInvitacion);
  console.log('Días con baja:', diasBaja);
  console.log('Días puntuales:', diasPuntuales);
  console.log('\n✨ TOTAL DÍAS A FACTURAR:', diasFacturables);
  console.log('\nDías facturables:', detalleFacturables.join(', '));
  console.log('\nESPERADO: 16 días');
  console.log('RESULTADO:', diasFacturables, 'días');
  console.log(diasFacturables === 16 ? '✅ CORRECTO' : '❌ INCORRECTO');
}

analizarLaia().catch(console.error);
