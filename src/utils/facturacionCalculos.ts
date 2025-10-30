import { supabase, InscripcionComedor, BajaComedor, SolicitudComida } from '../lib/supabase';
import type { Invitacion } from '../hooks/useInvitaciones';

export interface InscripcionComedorPadre {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}

export async function getDiasLaborablesMes(year: number, month: number): Promise<string[]> {
  const diasLaborables: string[] = [];
  const diasEnMes = new Date(year, month, 0).getDate();

  const { data: diasFestivos, error } = await supabase
    .from('dias_festivos')
    .select('fecha')
    .eq('activo', true)
    .gte('fecha', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('fecha', `${year}-${String(month + 1).padStart(2, '0')}-01`);

  if (error) {
    console.error('Error loading días festivos:', error);
  }

  const festivosSet = new Set(diasFestivos?.map(d => d.fecha) || []);

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay();
    const fechaStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    if (diaSemana >= 1 && diaSemana <= 5 && !festivosSet.has(fechaStr)) {
      diasLaborables.push(fechaStr);
    }
  }

  return diasLaborables;
}

export function estaEnRangoInscripcion(
  fecha: string,
  inscripcion: InscripcionComedor | InscripcionComedorPadre
): boolean {
  if (!inscripcion.activo) return false;

  const fechaDate = new Date(fecha);
  const diaSemana = fechaDate.getDay();

  if (!inscripcion.dias_semana.includes(diaSemana)) return false;

  const fechaInicio = new Date(inscripcion.fecha_inicio);
  const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;

  return fechaDate >= fechaInicio && (!fechaFin || fechaDate <= fechaFin);
}

export function tieneBaja(fecha: string, bajas: BajaComedor[]): boolean {
  const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return bajas.some(baja => baja.dias.includes(fechaFormateada));
}

export function tieneSolicitudPuntual(fecha: string, solicitudes: SolicitudComida[]): SolicitudComida | null {
  const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return solicitudes.find(solicitud =>
    solicitud.fecha === fechaFormateada && solicitud.estado === 'aprobada'
  ) || null;
}

export function tieneInvitacion(fecha: string, hijoId: string | null, padreId: string | null, invitaciones: Invitacion[]): boolean {
  return invitaciones.some(inv => {
    if (inv.fecha !== fecha) return false;

    // Si buscamos por hijo, solo comparar hijo_id
    if (hijoId !== null) {
      return inv.hijo_id === hijoId;
    }

    // Si buscamos por padre, solo comparar padre_id
    if (padreId !== null) {
      return inv.padre_id === padreId;
    }

    // Si ambos son null, no hay coincidencia
    return false;
  });
}

export interface ConfiguracionPrecios {
  precio: number;
  precio_adulto: number;
  precio_hijo_personal: number;
  descuento_tercer_hijo: number;
  descuento_asistencia_80: number;
  umbral_asistencia_descuento: number;
}

export async function obtenerConfiguracionPrecios(): Promise<ConfiguracionPrecios> {
  const { data: configPrecio, error } = await supabase
    .from('configuracion_precios')
    .select('precio, precio_adulto, precio_hijo_personal, descuento_tercer_hijo, descuento_asistencia_80, umbral_asistencia_descuento')
    .eq('activo', true)
    .lte('dias_min', 1)
    .gte('dias_max', 5)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener configuración de precios: ${error.message}`);
  }

  if (!configPrecio) {
    throw new Error('No se encontró configuración de precios activa. Por favor, configure los precios en el panel de administración.');
  }

  return {
    precio: configPrecio.precio,
    precio_adulto: configPrecio.precio_adulto,
    precio_hijo_personal: configPrecio.precio_hijo_personal,
    descuento_tercer_hijo: configPrecio.descuento_tercer_hijo || 0,
    descuento_asistencia_80: configPrecio.descuento_asistencia_80 || 18,
    umbral_asistencia_descuento: configPrecio.umbral_asistencia_descuento || 80
  };
}

export interface InfoDescuentoHijo {
  esHijoDePersonal: boolean;
  tieneDescuentoFamiliaNumerosa: boolean;
  posicionHijo: number;
  totalInscripcionesPadre: number;
}

export async function obtenerInfoDescuentoHijo(
  hijoId: string,
  padreId: string,
  inscripciones: InscripcionComedor[]
): Promise<InfoDescuentoHijo> {
  const { data: padreHijo } = await supabase
    .from('padres')
    .select('es_personal')
    .eq('id', padreId)
    .maybeSingle();

  const esHijoDePersonal = padreHijo?.es_personal || false;

  const { data: todosLosHijosDelPadre } = await supabase
    .from('hijos')
    .select('id')
    .eq('padre_id', padreId)
    .eq('activo', true);

  const idsHijosDelPadre = todosLosHijosDelPadre?.map(h => h.id) || [];

  const { count: totalInscripcionesPadre } = await supabase
    .from('comedor_inscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true)
    .in('hijo_id', idsHijosDelPadre);

  let posicionHijo = 1;
  if (totalInscripcionesPadre && totalInscripcionesPadre >= 3) {
    const inscripcionesDelPadre = inscripciones
      .filter(i => idsHijosDelPadre.includes(i.hijo_id) && i.activo)
      .sort((a, b) => {
        const descuentoA = a.descuento_aplicado || 0;
        const descuentoB = b.descuento_aplicado || 0;
        const precioBaseA = descuentoA > 0 ? a.precio_diario / (1 - descuentoA / 100) : a.precio_diario;
        const precioBaseB = descuentoB > 0 ? b.precio_diario / (1 - descuentoB / 100) : b.precio_diario;

        const precioTotalA = precioBaseA * a.dias_semana.length;
        const precioTotalB = precioBaseB * b.dias_semana.length;

        if (precioTotalB !== precioTotalA) return precioTotalB - precioTotalA;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    posicionHijo = inscripcionesDelPadre.findIndex(i => i.hijo_id === hijoId) + 1;
  }

  const tieneDescuentoFamiliaNumerosa = posicionHijo >= 3 && (totalInscripcionesPadre || 0) >= 3;

  return {
    esHijoDePersonal,
    tieneDescuentoFamiliaNumerosa,
    posicionHijo,
    totalInscripcionesPadre: totalInscripcionesPadre || 0
  };
}

export function calcularPrecioPuntual(
  precioDiarioInscripcion: number | null
): number {
  // Si no hay inscripción activa, retornar 0 (no debería ocurrir en días puntuales válidos)
  // Los días puntuales deben usar el mismo precio que tiene el alumno en su inscripción
  return precioDiarioInscripcion || 0;
}

/**
 * Calcula los días esperados de asistencia según la inscripción del hijo/padre
 * @param diasLaborables - Todos los días laborables del mes
 * @param inscripcion - La inscripción activa del hijo o padre
 * @returns Número de días que se espera que asista según su inscripción
 */
export function calcularDiasEsperadosInscripcion(
  diasLaborables: string[],
  inscripcion: InscripcionComedor | InscripcionComedorPadre | null
): number {
  if (!inscripcion) return 0;

  const fechaInicio = new Date(inscripcion.fecha_inicio);
  const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;

  let diasEsperados = 0;

  for (const fecha of diasLaborables) {
    const fechaDate = new Date(fecha);
    const diaSemana = fechaDate.getDay();

    // Verificar si el día de la semana está en la inscripción
    if (!inscripcion.dias_semana.includes(diaSemana)) continue;

    // Verificar si está dentro del rango de fechas de la inscripción
    if (fechaDate >= fechaInicio && (!fechaFin || fechaDate <= fechaFin)) {
      diasEsperados++;
    }
  }

  return diasEsperados;
}
