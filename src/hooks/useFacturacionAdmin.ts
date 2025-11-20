import { useState, useEffect } from 'react';
import { supabase, Padre, Hijo, InscripcionComedor, BajaComedor, SolicitudComida } from '../lib/supabase';
import {
  getDiasLaborablesMes,
  estaEnRangoInscripcion,
  tieneBaja,
  tieneSolicitudPuntual,
  tieneInvitacion,
  obtenerConfiguracionPrecios,
  calcularPrecioPuntual,
  calcularDiasEsperadosInscripcion,
  InscripcionComedorPadre,
  estaExentoEnFecha
} from '../utils/facturacionCalculos';
import type { Invitacion } from './useInvitaciones';

export interface DiaFacturable {
  fecha: string;
  tipo: 'inscripcion' | 'puntual';
  precio: number;
  descripcion: string;
}

export interface HijoFacturacionDetalle {
  hijo: Hijo;
  inscripcion: InscripcionComedor | null;
  diasFacturables: DiaFacturable[];
  diasInscripcion: number;
  diasPuntuales: number;
  diasBaja: number;
  diasInvitacion: number;
  totalImporte: number;
  totalImporteSinDescuento?: number;
  esHijoDePersonal: boolean;
  tieneDescuentoFamiliaNumerosa: boolean;
  porcentajeDescuento: number;
  tieneDescuentoAsistencia80?: boolean;
  porcentajeDescuentoAsistencia80?: number;
  porcentajeAsistencia?: number;
  estaExento: boolean;
  motivoExencion?: string;
}

export interface PadreFacturacionDetalle {
  inscripcion: InscripcionComedorPadre | null;
  diasFacturables: DiaFacturable[];
  diasInscripcion: number;
  diasPuntuales: number;
  diasBaja: number;
  diasInvitacion: number;
  totalImporte: number;
  totalImporteSinDescuento?: number;
  tieneDescuentoAsistencia80?: boolean;
  porcentajeDescuentoAsistencia80?: number;
  porcentajeAsistencia?: number;
  estaExento: boolean;
  motivoExencion?: string;
}

export interface FacturacionPadre {
  padre: Padre;
  hijos: HijoFacturacionDetalle[];
  padreComedor: PadreFacturacionDetalle | null;
  totalGeneral: number;
  totalDias: number;
}

interface InfoDescuentoPadre {
  esPersonal: boolean;
  totalInscripcionesActivas: number;
  idsHijos: string[];
  inscripcionesOrdenadas: InscripcionComedor[];
}

export function useFacturacionAdmin(mesSeleccionado: string) {
  const [facturacion, setFacturacion] = useState<FacturacionPadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calcularFacturacion = async () => {
    try {
      setLoading(true);
      setError(null);

      const [year, month] = mesSeleccionado.split('-').map(Number);

      const ultimoDiaMes = new Date(year, month, 0).getDate();
      const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
      const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

      const [padresResult, hijosResult, inscripcionesResult, bajasResult, solicitudesResult, inscripcionesPadreResult, invitacionesResult] = await Promise.all([
        supabase
          .from('padres')
          .select(`
            *,
            exento_facturacion,
            motivo_exencion,
            fecha_inicio_exencion,
            fecha_fin_exencion
          `)
          .eq('activo', true)
          .order('nombre'),

        supabase
          .from('hijos')
          .select(`
            *,
            grado:grados(*),
            exento_facturacion,
            motivo_exencion,
            fecha_inicio_exencion,
            fecha_fin_exencion
          `)
          .eq('activo', true)
          .order('nombre'),

        // IMPORTANTE: Incluir inscripciones activas Y desactivadas que estuvieron activas durante el mes
        // Esto permite facturar proporcionalmente cuando una inscripción se desactiva a mitad de mes
        supabase
          .from('comedor_inscripciones')
          .select('*')
          .or(`and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`),

        supabase
          .from('comedor_bajas')
          .select('*')
          .order('fecha_creacion'),

        supabase
          .from('comedor_altaspuntuales')
          .select('*')
          .eq('estado', 'aprobada')
          .order('fecha_creacion'),

        // IMPORTANTE: Incluir inscripciones de padres activas Y desactivadas que estuvieron activas durante el mes
        // Obtener todas sin filtros complejos - filtraremos en el código
        supabase
          .from('comedor_inscripciones_padres')
          .select('*'),

        supabase
          .from('invitaciones_comedor')
          .select('*')
          .gte('fecha', fechaInicioMes)
          .lte('fecha', fechaFinMes)
      ]);

      if (padresResult.error) throw padresResult.error;
      if (hijosResult.error) throw hijosResult.error;
      if (inscripcionesResult.error) throw inscripcionesResult.error;
      if (bajasResult.error) throw bajasResult.error;
      if (solicitudesResult.error) throw solicitudesResult.error;
      if (inscripcionesPadreResult.error) throw inscripcionesPadreResult.error;
      if (invitacionesResult.error) throw invitacionesResult.error;

      const padres = padresResult.data || [];
      const hijos = hijosResult.data || [];
      const inscripciones = inscripcionesResult.data || [];
      const bajas = bajasResult.data || [];
      const solicitudes = solicitudesResult.data || [];
      const invitaciones = invitacionesResult.data || [];

      // Filtrar inscripciones de padres que aplican al mes seleccionado
      const todasInscripcionesPadre = inscripcionesPadreResult.data || [];
      const inscripcionesPadre = todasInscripcionesPadre.filter(insc => {
        const fechaInicioInsc = new Date(insc.fecha_inicio);
        const fechaFinInsc = insc.fecha_fin ? new Date(insc.fecha_fin) : null;
        const fechaInicioMesDate = new Date(fechaInicioMes);
        const fechaFinMesDate = new Date(fechaFinMes);

        // Incluir si: empezó antes del fin del mes Y (no tiene fin O termina después del inicio del mes)
        return fechaInicioInsc <= fechaFinMesDate &&
               (!fechaFinInsc || fechaFinInsc >= fechaInicioMesDate);
      });

      const diasLaborables = await getDiasLaborablesMes(year, month);
      const configuracionPrecios = await obtenerConfiguracionPrecios();

      const infoDescuentosPorPadre = new Map<string, InfoDescuentoPadre>();

      for (const padre of padres) {
        const hijosDelPadre = hijos.filter(h => h.padre_id === padre.id);
        const idsHijos = hijosDelPadre.map(h => h.id);

        // Incluir inscripciones activas y las que estuvieron activas durante el mes
        const inscripcionesDelPadre = inscripciones.filter(i => idsHijos.includes(i.hijo_id));

        const inscripcionesOrdenadas = [...inscripcionesDelPadre].sort((a, b) => {
          const descuentoA = a.descuento_aplicado || 0;
          const descuentoB = b.descuento_aplicado || 0;
          const precioBaseA = descuentoA > 0 ? a.precio_diario / (1 - descuentoA / 100) : a.precio_diario;
          const precioBaseB = descuentoB > 0 ? b.precio_diario / (1 - descuentoB / 100) : b.precio_diario;

          const precioTotalA = precioBaseA * a.dias_semana.length;
          const precioTotalB = precioBaseB * b.dias_semana.length;

          if (precioTotalB !== precioTotalA) return precioTotalB - precioTotalA;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        infoDescuentosPorPadre.set(padre.id, {
          esPersonal: padre.es_personal,
          totalInscripcionesActivas: inscripcionesOrdenadas.length,
          idsHijos,
          inscripcionesOrdenadas
        });
      }

      const facturacionPadres: FacturacionPadre[] = [];

      for (const padre of padres) {
        const hijosDelPadre = hijos.filter(h => h.padre_id === padre.id);
        const hijosFacturacion: HijoFacturacionDetalle[] = [];

        const infoPadre = infoDescuentosPorPadre.get(padre.id)!;

        for (const hijo of hijosDelPadre) {
          // Obtener TODAS las inscripciones del hijo (activas O desactivadas durante el mes)
          const inscripcionesHijo = inscripciones.filter(i => i.hijo_id === hijo.id);

          const esHijoDePersonal = infoPadre.esPersonal;
          const posicionHijo = infoPadre.inscripcionesOrdenadas.findIndex(i => i.hijo_id === hijo.id) + 1;
          const tieneDescuentoFamiliaNumerosa = posicionHijo >= 3 && infoPadre.totalInscripcionesActivas >= 3;

          const bajasHijo = bajas.filter(b => b.hijo_id === hijo.id);
          const solicitudesHijo = solicitudes.filter(s => s.hijo_id === hijo.id);

          const diasFacturables: DiaFacturable[] = [];
          let diasInscripcion = 0;
          let diasPuntuales = 0;
          let diasBaja = 0;
          let diasInvitacion = 0;

          for (const fecha of diasLaborables) {
            if (tieneInvitacion(fecha, hijo.id, null, invitaciones)) {
              diasInvitacion++;
              continue;
            }

            if (tieneBaja(fecha, bajasHijo)) {
              diasBaja++;
              continue;
            }

            const solicitudPuntual = tieneSolicitudPuntual(fecha, solicitudesHijo);
            if (solicitudPuntual) {
              diasPuntuales++;

              // Los días puntuales usan el mismo precio que la inscripción aplicable para ese día
              // Buscar qué inscripción aplica para esta fecha específica
              const inscripcionParaDia = inscripcionesHijo.find(i => estaEnRangoInscripcion(fecha, i));
              const precioPuntual = calcularPrecioPuntual(
                inscripcionParaDia?.precio_diario || null
              );

              diasFacturables.push({
                fecha,
                tipo: 'puntual',
                precio: precioPuntual,
                descripcion: 'Comida puntual solicitada'
              });
              continue;
            }

            // Buscar qué inscripción aplica para esta fecha específica
            const inscripcionParaDia = inscripcionesHijo.find(i => estaEnRangoInscripcion(fecha, i));
            if (inscripcionParaDia) {
              diasInscripcion++;
              diasFacturables.push({
                fecha,
                tipo: 'inscripcion',
                precio: inscripcionParaDia.precio_diario,
                descripcion: 'Comida por inscripción'
              });
            }
          }

          let totalImporteSinDescuentoAsistencia = diasFacturables.reduce((sum, dia) => sum + dia.precio, 0);

          // Calcular el umbral de días requeridos para el descuento
          // Si el mes tiene 22 días laborables y el umbral es 80%, necesita asistir: 22 × 0.80 = 17.6 días
          // Se redondea hacia ARRIBA: Math.ceil(17.6) = 18 días mínimos
          const totalDiasLaborables = diasLaborables.length;
          const diasAsistidos = diasFacturables.length;
          const umbralDiasRequeridos = totalDiasLaborables > 0
            ? Math.ceil(totalDiasLaborables * (configuracionPrecios.umbral_asistencia_descuento / 100))
            : 0;

          // Calcular el porcentaje real de asistencia (solo para mostrar)
          const porcentajeAsistencia = totalDiasLaborables > 0
            ? Math.round((diasAsistidos / totalDiasLaborables) * 100)
            : 0;

          // Aplicar descuento si asiste al número mínimo de días requeridos
          const tieneDescuentoAsistencia80 = diasAsistidos >= umbralDiasRequeridos && diasAsistidos > 0;
          const porcentajeDescuentoAsistencia80 = tieneDescuentoAsistencia80 ? configuracionPrecios.descuento_asistencia_80 : 0;

          let totalImporte = totalImporteSinDescuentoAsistencia;
          if (tieneDescuentoAsistencia80) {
            totalImporte = totalImporteSinDescuentoAsistencia * (1 - porcentajeDescuentoAsistencia80 / 100);
          }

          // Verificar exención: si está exento en CUALQUIER día del mes, queda exento TODO el mes
          const primerDiaMes = diasLaborables[0] || fechaInicioMes;
          const estaExento = estaExentoEnFecha(
            hijo.exento_facturacion || false,
            hijo.fecha_inicio_exencion,
            hijo.fecha_fin_exencion,
            primerDiaMes
          );

          // Si está exento, el importe es 0 (pero mantenemos el cálculo teórico)
          if (estaExento) {
            totalImporte = 0;
          }

          // Para mostrar en el resumen, usar la primera inscripción o null
          const inscripcionRepresentativa = inscripcionesHijo.length > 0 ? inscripcionesHijo[0] : null;

          hijosFacturacion.push({
            hijo,
            inscripcion: inscripcionRepresentativa,
            diasFacturables,
            diasInscripcion,
            diasPuntuales,
            diasBaja,
            diasInvitacion,
            totalImporte,
            totalImporteSinDescuento: tieneDescuentoAsistencia80 || estaExento ? totalImporteSinDescuentoAsistencia : undefined,
            esHijoDePersonal,
            tieneDescuentoFamiliaNumerosa,
            porcentajeDescuento: tieneDescuentoFamiliaNumerosa ? configuracionPrecios.descuento_tercer_hijo : 0,
            tieneDescuentoAsistencia80,
            porcentajeDescuentoAsistencia80,
            porcentajeAsistencia,
            estaExento,
            motivoExencion: estaExento ? hijo.motivo_exencion : undefined
          });
        }

        let padreComedor: PadreFacturacionDetalle | null = null;

        if (padre.es_personal) {
          // Obtener TODAS las inscripciones del padre (activas O desactivadas durante el mes)
          const inscripcionesPadreDelPadre = inscripcionesPadre.filter(i => i.padre_id === padre.id);
          const bajasPadre = bajas.filter(b => b.padre_id === padre.id);
          const solicitudesPadre = solicitudes.filter(s => s.padre_id === padre.id);

          const diasFacturables: DiaFacturable[] = [];
          let diasInscripcion = 0;
          let diasPuntuales = 0;
          let diasBaja = 0;
          let diasInvitacion = 0;

          for (const fecha of diasLaborables) {
            if (tieneInvitacion(fecha, null, padre.id, invitaciones)) {
              diasInvitacion++;
              continue;
            }

            if (tieneBaja(fecha, bajasPadre)) {
              diasBaja++;
              continue;
            }

            const solicitudPuntual = tieneSolicitudPuntual(fecha, solicitudesPadre);
            if (solicitudPuntual) {
              diasPuntuales++;
              // Los días puntuales del padre usan el mismo precio que la inscripción aplicable para ese día
              // Buscar qué inscripción aplica para esta fecha específica
              const inscripcionParaDia = inscripcionesPadreDelPadre.find(i => {
                const fechaDate = new Date(fecha);
                const diaSemana = fechaDate.getDay();
                const fechaInicio = new Date(i.fecha_inicio);
                const fechaFin = i.fecha_fin ? new Date(i.fecha_fin) : null;

                return i.dias_semana.includes(diaSemana) &&
                  fechaDate >= fechaInicio &&
                  (!fechaFin || fechaDate <= fechaFin);
              });
              const precioPuntualPadre = inscripcionParaDia?.precio_diario || configuracionPrecios.precio_adulto;

              diasFacturables.push({
                fecha,
                tipo: 'puntual',
                precio: precioPuntualPadre,
                descripcion: 'Comida puntual solicitada (Personal del colegio)'
              });
              continue;
            }

            // Buscar qué inscripción aplica para esta fecha específica
            const inscripcionParaDia = inscripcionesPadreDelPadre.find(i => {
              const fechaDate = new Date(fecha);
              const diaSemana = fechaDate.getDay();
              const fechaInicio = new Date(i.fecha_inicio);
              const fechaFin = i.fecha_fin ? new Date(i.fecha_fin) : null;

              return i.dias_semana.includes(diaSemana) &&
                fechaDate >= fechaInicio &&
                (!fechaFin || fechaDate <= fechaFin);
            });

            if (inscripcionParaDia) {
              diasInscripcion++;
              diasFacturables.push({
                fecha,
                tipo: 'inscripcion',
                precio: inscripcionParaDia.precio_diario,
                descripcion: 'Comida por inscripción (Personal)'
              });
            }
          }

          let totalImporteSinDescuentoAsistencia = diasFacturables.reduce((sum, dia) => sum + dia.precio, 0);

          // Calcular el umbral de días requeridos para el descuento (padre)
          // Si el mes tiene 22 días laborables y el umbral es 80%, necesita asistir: 22 × 0.80 = 17.6 días
          // Se redondea hacia ARRIBA: Math.ceil(17.6) = 18 días mínimos
          const totalDiasLaborables = diasLaborables.length;
          const diasAsistidosPadre = diasFacturables.length;
          const umbralDiasRequeridos = totalDiasLaborables > 0
            ? Math.ceil(totalDiasLaborables * (configuracionPrecios.umbral_asistencia_descuento / 100))
            : 0;

          // Calcular el porcentaje real de asistencia (solo para mostrar)
          const porcentajeAsistencia = totalDiasLaborables > 0
            ? Math.round((diasAsistidosPadre / totalDiasLaborables) * 100)
            : 0;

          // Aplicar descuento si asiste al número mínimo de días requeridos
          const tieneDescuentoAsistencia80 = diasAsistidosPadre >= umbralDiasRequeridos && diasAsistidosPadre > 0;
          const porcentajeDescuentoAsistencia80 = tieneDescuentoAsistencia80 ? configuracionPrecios.descuento_asistencia_80 : 0;

          let totalImporte = totalImporteSinDescuentoAsistencia;
          if (tieneDescuentoAsistencia80) {
            totalImporte = totalImporteSinDescuentoAsistencia * (1 - porcentajeDescuentoAsistencia80 / 100);
          }

          // Verificar exención del padre: si está exento en CUALQUIER día del mes, queda exento TODO el mes
          const primerDiaMes = diasLaborables[0] || fechaInicioMes;
          const estaExentoPadre = estaExentoEnFecha(
            padre.exento_facturacion || false,
            padre.fecha_inicio_exencion,
            padre.fecha_fin_exencion,
            primerDiaMes
          );

          // Si está exento, el importe es 0 (pero mantenemos el cálculo teórico)
          if (estaExentoPadre) {
            totalImporte = 0;
          }

          if (totalImporte > 0 || diasInvitacion > 0 || estaExentoPadre) {
            // Para mostrar en el resumen, usar la primera inscripción o null
            const inscripcionRepresentativaPadre = inscripcionesPadreDelPadre.length > 0 ? inscripcionesPadreDelPadre[0] : null;

            padreComedor = {
              inscripcion: inscripcionRepresentativaPadre,
              diasFacturables,
              diasInscripcion,
              diasPuntuales,
              diasBaja,
              diasInvitacion,
              totalImporte,
              totalImporteSinDescuento: tieneDescuentoAsistencia80 || estaExentoPadre ? totalImporteSinDescuentoAsistencia : undefined,
              tieneDescuentoAsistencia80,
              porcentajeDescuentoAsistencia80,
              porcentajeAsistencia,
              estaExento: estaExentoPadre,
              motivoExencion: estaExentoPadre ? padre.motivo_exencion : undefined
            };
          }
        }

        const totalHijos = hijosFacturacion.reduce((sum, h) => sum + h.totalImporte, 0);
        const totalPadre = padreComedor ? padreComedor.totalImporte : 0;
        const totalGeneral = totalHijos + totalPadre;

        const totalDiasHijos = hijosFacturacion.reduce((sum, h) => sum + h.diasFacturables.length, 0);
        const totalDiasPadre = padreComedor ? padreComedor.diasFacturables.length : 0;
        const totalDias = totalDiasHijos + totalDiasPadre;

        // Incluir familia si:
        // - Tiene importe a pagar (totalGeneral > 0), O
        // - Tiene hijos exentos CON días de servicio, O
        // - El padre está exento CON días de servicio
        const tieneHijosExentosConServicio = hijosFacturacion.some(h => h.estaExento && h.diasFacturables.length > 0);
        const tienePadreExentoConServicio = padreComedor?.estaExento && (padreComedor?.diasFacturables.length > 0) || false;

        if (totalGeneral > 0 || tieneHijosExentosConServicio || tienePadreExentoConServicio) {
          facturacionPadres.push({
            padre,
            hijos: hijosFacturacion,
            padreComedor,
            totalGeneral,
            totalDias
          });
        }
      }

      facturacionPadres.sort((a, b) => b.totalGeneral - a.totalGeneral);
      setFacturacion(facturacionPadres);

    } catch (err: any) {
      console.error('Error calculando facturación:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calcularFacturacion();
  }, [mesSeleccionado]);

  return {
    facturacion,
    loading,
    error,
    refetch: calcularFacturacion
  };
}
