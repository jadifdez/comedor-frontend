import { useState, useEffect } from 'react';
import { supabase, InscripcionComedor, BajaComedor, SolicitudComida, Hijo, Padre } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import {
  getDiasLaborablesMes,
  estaEnRangoInscripcion,
  tieneBaja,
  tieneSolicitudPuntual,
  tieneInvitacion,
  obtenerConfiguracionPrecios,
  obtenerInfoDescuentoHijo,
  calcularPrecioPuntual,
  calcularDiasEsperadosInscripcion,
  InscripcionComedorPadre,
  estaExentoEnFecha
} from '../utils/facturacionCalculos';
import type { Invitacion } from './useInvitaciones';

export interface DiaFacturable {
  fecha: string; // YYYY-MM-DD
  tipo: 'inscripcion' | 'puntual';
  precio: number;
  descripcion: string;
}

export interface PersonaFacturable {
  id: string;
  nombre: string;
  detalle?: string;
  tipo: 'hijo' | 'padre';
}

export interface FacturacionHijo {
  hijo: Hijo;
  persona?: PersonaFacturable;
  inscripcion: InscripcionComedor | InscripcionComedorPadre | null;
  diasFacturables: DiaFacturable[];
  totalDias: number;
  totalImporte: number;
  totalImporteSinDescuento?: number;
  precioBaseSinDescuentos?: number;
  desglose: {
    diasInscripcion: number;
    diasPuntuales: number;
    diasBaja: number;
    diasFestivos: number;
    diasInvitacion: number;
  };
  esHijoDePersonal?: boolean;
  tieneDescuentoFamiliaNumerosa?: boolean;
  porcentajeDescuento?: number;
  tieneDescuentoAsistencia80?: boolean;
  porcentajeDescuentoAsistencia80?: number;
  porcentajeAsistencia?: number;
  posicionHijo?: number;
  totalInscripcionesPadre?: number;
  ahorroTotalDescuentos?: number;
  estaExento?: boolean;
  motivoExencion?: string;
}

export interface ResumenFacturacion {
  mesSeleccionado: string;
  hijosFacturacion: FacturacionHijo[];
  totalGeneral: number;
  totalDias: number;
  totalSinDescuentos: number;
  ahorroTotalDescuentos: number;
}

export function useFacturacion(user: User) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });


  // Función principal para calcular la facturación
  const calcularFacturacion = async (mes: string): Promise<ResumenFacturacion> => {
    const [year, month] = mes.split('-').map(Number);

    // Calcular el último día del mes
    const ultimoDiaMes = new Date(year, month, 0).getDate();
    const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
    const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

    try {
      // Primero obtener el padre_id del usuario autenticado
      const { data: padreDataList, error: padreError } = await supabase
        .from('padres')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (padreError) throw padreError;
      if (!padreDataList || padreDataList.length === 0) {
        throw new Error('No se encontró información del padre');
      }

      const padreId = padreDataList[0].id;

      // Primero obtener los IDs de los hijos del padre
      const { data: hijosIds, error: hijosIdsError } = await supabase
        .from('hijos')
        .select('id')
        .eq('padre_id', padreId)
        .eq('activo', true);

      if (hijosIdsError) throw hijosIdsError;

      const hijoIdsList = hijosIds?.map(h => h.id) || [];

      // Cargar todos los datos necesarios
      const [hijosResult, inscripcionesResult, bajasResult, solicitudesResult, padreResult, inscripcionesPadreResult, invitacionesResult] = await Promise.all([
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
          .eq('padre_id', padreId)
          .eq('activo', true)
          .order('nombre'),

        // IMPORTANTE: Incluir inscripciones activas Y desactivadas que estuvieron activas durante el mes
        // Esto permite facturar proporcionalmente cuando una inscripción se desactiva a mitad de mes
        hijoIdsList.length > 0
          ? supabase
              .from('comedor_inscripciones')
              .select('*')
              .in('hijo_id', hijoIdsList)
              .or(`and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`)
          : Promise.resolve({ data: [], error: null }),

        hijoIdsList.length > 0
          ? supabase
              .from('comedor_bajas')
              .select('*')
              .or(`hijo_id.in.(${hijoIdsList.join(',')}),padre_id.eq.${padreId}`)
              .order('fecha_creacion')
          : supabase
              .from('comedor_bajas')
              .select('*')
              .eq('padre_id', padreId)
              .order('fecha_creacion'),

        hijoIdsList.length > 0
          ? supabase
              .from('comedor_altaspuntuales')
              .select('*')
              .or(`hijo_id.in.(${hijoIdsList.join(',')}),padre_id.eq.${padreId}`)
              .eq('estado', 'aprobada')
              .order('fecha_creacion')
          : supabase
              .from('comedor_altaspuntuales')
              .select('*')
              .eq('padre_id', padreId)
              .eq('estado', 'aprobada')
              .order('fecha_creacion'),

        supabase
          .from('padres')
          .select('*')
          .eq('id', padreId)
          .maybeSingle(),

        // IMPORTANTE: Incluir inscripciones de padres activas Y desactivadas que estuvieron activas durante el mes
        supabase
          .from('comedor_inscripciones_padres')
          .select('*')
          .eq('padre_id', padreId)
          .or(`and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`),

        hijoIdsList.length > 0
          ? supabase
              .from('invitaciones_comedor')
              .select('*')
              .or(`hijo_id.in.(${hijoIdsList.join(',')}),padre_id.eq.${padreId}`)
              .gte('fecha', fechaInicioMes)
              .lte('fecha', fechaFinMes)
          : supabase
              .from('invitaciones_comedor')
              .select('*')
              .eq('padre_id', padreId)
              .gte('fecha', fechaInicioMes)
              .lte('fecha', fechaFinMes)
      ]);

      if (hijosResult.error) throw hijosResult.error;
      if (inscripcionesResult.error) throw inscripcionesResult.error;
      if (bajasResult.error) throw bajasResult.error;
      if (solicitudesResult.error) throw solicitudesResult.error;
      if (padreResult.error) throw padreResult.error;
      if (inscripcionesPadreResult.error) throw inscripcionesPadreResult.error;
      if (invitacionesResult.error) throw invitacionesResult.error;

      const hijos = hijosResult.data || [];
      const inscripciones = inscripcionesResult.data || [];
      const bajas = bajasResult.data || [];
      const solicitudes = solicitudesResult.data || [];
      const padre = padreResult.data;
      const inscripcionesPadre = inscripcionesPadreResult.data || [];
      const invitaciones = invitacionesResult.data || [];

      // Si no existe el padre, no hay facturación
      if (!padre) {
        return {
          hijosFacturacion: [],
          totalGeneral: 0,
          totalDias: 0,
          totalSinDescuentos: 0,
          ahorroTotalDescuentos: 0
        };
      }

      // Obtener días laborables del mes
      const diasLaborables = await getDiasLaborablesMes(year, month);

      const hijosFacturacion: FacturacionHijo[] = [];

      const configuracionPrecios = await obtenerConfiguracionPrecios();

      // Procesar facturación para hijos
      for (const hijo of hijos) {
        // Obtener TODAS las inscripciones del hijo (activas O desactivadas durante el mes)
        const inscripcionesHijo = inscripciones.filter(i => i.hijo_id === hijo.id);

        const infoDescuento = await obtenerInfoDescuentoHijo(hijo.id, hijo.padre_id, inscripciones);
        const { esHijoDePersonal, tieneDescuentoFamiliaNumerosa, posicionHijo, totalInscripcionesPadre } = infoDescuento;

        const bajasHijo = bajas.filter(b => b.hijo_id === hijo.id);
        const solicitudesHijo = solicitudes.filter(s => s.hijo_id === hijo.id);

        const diasFacturables: DiaFacturable[] = [];
        let diasInscripcion = 0;
        let diasPuntuales = 0;
        let diasBaja = 0;
        let diasFestivos = 0;
        let diasInvitacion = 0;

        // Obtener días festivos del mes
        const { data: festivosData } = await supabase
          .from('dias_festivos')
          .select('fecha')
          .eq('activo', true)
          .gte('fecha', fechaInicioMes)
          .lte('fecha', fechaFinMes);

        const festivosSet = new Set(festivosData?.map(d => d.fecha) || []);

        // Contar días festivos que coincidan con alguna inscripción
        for (const festivo of festivosData || []) {
          const fechaFestivo = festivo.fecha;
          const inscripcionParaDia = inscripcionesHijo.find(i => estaEnRangoInscripcion(fechaFestivo, i));
          if (inscripcionParaDia) {
            diasFestivos++;
            diasInscripcion++;
          }
        }

        for (const fecha of diasLaborables) {
          const fechaDate = new Date(fecha);

          // Verificar si tiene invitación para este día (prioridad máxima)
          if (tieneInvitacion(fecha, hijo.id, null, invitaciones)) {
            diasInvitacion++;
            // Las invitaciones NO se facturan, por lo tanto NO se añaden a diasFacturables
            // Pero SÍ se cuentan en diasInscripcion si el alumno estaba inscrito ese día
            const inscripcionParaDia = inscripcionesHijo.find(i => estaEnRangoInscripcion(fecha, i));
            if (inscripcionParaDia) {
              diasInscripcion++;
            }
            continue;
          }

          // Verificar si tiene baja para este día
          if (tieneBaja(fecha, bajasHijo)) {
            diasBaja++;
            continue;
          }

          // Verificar si tiene solicitud puntual aprobada
          const solicitudPuntual = tieneSolicitudPuntual(fecha, solicitudesHijo);
          if (solicitudPuntual) {
            diasPuntuales++;

            // Los días puntuales usan el mismo precio que la inscripción aplicable para ese día
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
            // Usar el precio_diario de la inscripción, que ya tiene aplicados descuentos (personal + familia numerosa)
            diasFacturables.push({
              fecha,
              tipo: 'inscripcion',
              precio: inscripcionParaDia.precio_diario,
              descripcion: 'Comida por inscripción'
            });
          }
        }

        // Calcular el precio base sin ningún descuento (precio estándar del comedor)
        let precioBaseSinDescuentos = 0;
        // Usar la primera inscripción para determinar si hay descuento aplicado
        const inscripcionRepresentativa = inscripcionesHijo.length > 0 ? inscripcionesHijo[0] : null;
        if (inscripcionRepresentativa && inscripcionRepresentativa.descuento_aplicado > 0) {
          // Revertir el descuento familiar para obtener el precio base
          const precioBasePorDia = inscripcionRepresentativa.precio_diario / (1 - inscripcionRepresentativa.descuento_aplicado / 100);
          precioBaseSinDescuentos = diasFacturables.reduce((sum, dia) => {
            if (dia.tipo === 'inscripcion') {
              return sum + precioBasePorDia;
            } else {
              return sum + precioBasePorDia;
            }
          }, 0);
        } else {
          precioBaseSinDescuentos = diasFacturables.reduce((sum, dia) => sum + dia.precio, 0);
        }

        // Calcular el importe total sumando el precio de cada día facturable (ya con descuento familiar aplicado)
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

        const ahorroTotalDescuentos = precioBaseSinDescuentos - totalImporte;

        hijosFacturacion.push({
          hijo,
          inscripcion: inscripcionRepresentativa,
          diasFacturables,
          totalDias: diasFacturables.length,
          totalImporte,
          totalImporteSinDescuento: tieneDescuentoAsistencia80 || estaExento ? totalImporteSinDescuentoAsistencia : undefined,
          precioBaseSinDescuentos,
          desglose: {
            diasInscripcion,
            diasPuntuales,
            diasBaja,
            diasFestivos,
            diasInvitacion
          },
          esHijoDePersonal,
          tieneDescuentoFamiliaNumerosa,
          porcentajeDescuento: tieneDescuentoFamiliaNumerosa ? configuracionPrecios.descuento_tercer_hijo : 0,
          tieneDescuentoAsistencia80,
          porcentajeDescuentoAsistencia80,
          porcentajeAsistencia,
          posicionHijo,
          totalInscripcionesPadre,
          ahorroTotalDescuentos,
          estaExento,
          motivoExencion: estaExento ? hijo.motivo_exencion : undefined
        });
      }

      // Procesar facturación para el padre (si es personal del colegio)
      if (padre && padre.es_personal && inscripcionesPadre.length > 0) {
        // Obtener TODAS las inscripciones del padre (activas O desactivadas durante el mes)
        const bajasPadre = bajas.filter(b => b.padre_id === padre.id);
        const solicitudesPadre = solicitudes.filter(s => s.padre_id === padre.id);

        const diasFacturables: DiaFacturable[] = [];
        let diasInscripcion = 0;
        let diasPuntuales = 0;
        let diasBaja = 0;
        let diasFestivos = 0;
        let diasInvitacion = 0;

        // Obtener días festivos del mes
        const { data: festivosDataPadre } = await supabase
          .from('dias_festivos')
          .select('fecha')
          .eq('activo', true)
          .gte('fecha', fechaInicioMes)
          .lte('fecha', fechaFinMes);

        const festivosSetPadre = new Set(festivosDataPadre?.map(d => d.fecha) || []);

        // Contar días festivos que coincidan con alguna inscripción del padre
        for (const festivo of festivosDataPadre || []) {
          const fechaFestivo = festivo.fecha;
          const inscripcionParaDia = inscripcionesPadre.find(i => {
            const fechaDate = new Date(fechaFestivo);
            const diaSemana = fechaDate.getDay();
            const fechaInicio = new Date(i.fecha_inicio);
            const fechaFin = i.fecha_fin ? new Date(i.fecha_fin) : null;

            return i.dias_semana.includes(diaSemana) &&
              fechaDate >= fechaInicio &&
              (!fechaFin || fechaDate <= fechaFin);
          });

          if (inscripcionParaDia) {
            diasFestivos++;
            diasInscripcion++;
          }
        }

        for (const fecha of diasLaborables) {
          // Verificar si tiene invitación para este día (prioridad máxima)
          if (tieneInvitacion(fecha, null, padre.id, invitaciones)) {
            diasInvitacion++;
            // Las invitaciones NO se facturan, por lo tanto NO se añaden a diasFacturables
            // Pero SÍ se cuentan en diasInscripcion si el padre estaba inscrito ese día
            const inscripcionParaDia = inscripcionesPadre.find(i => {
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
            }
            continue;
          }

          // Verificar si tiene baja para este día
          if (tieneBaja(fecha, bajasPadre)) {
            diasBaja++;
            continue;
          }

          // Verificar si tiene solicitud puntual aprobada
          const solicitudPuntual = tieneSolicitudPuntual(fecha, solicitudesPadre);
          if (solicitudPuntual) {
            diasPuntuales++;
            // Los días puntuales del padre usan el mismo precio que la inscripción aplicable para ese día
            const inscripcionParaDia = inscripcionesPadre.find(i => {
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
          const inscripcionParaDia = inscripcionesPadre.find(i => {
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
              descripcion: 'Comida por inscripción'
            });
          }
        }

        // Para padres, el precio base es el mismo ya que no tienen descuentos familiares
        let precioBaseSinDescuentos = diasFacturables.reduce((sum, dia) => sum + dia.precio, 0);
        let totalImporteSinDescuentoAsistencia = precioBaseSinDescuentos;

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
        const primerDiaMesPadre = diasLaborables[0] || fechaInicioMes;
        const estaExentoPadre = estaExentoEnFecha(
          padre.exento_facturacion || false,
          padre.fecha_inicio_exencion,
          padre.fecha_fin_exencion,
          primerDiaMesPadre
        );

        // Si está exento, el importe es 0 (pero mantenemos el cálculo teórico)
        if (estaExentoPadre) {
          totalImporte = 0;
        }

        const ahorroTotalDescuentos = precioBaseSinDescuentos - totalImporte;

        // Para mostrar en el resumen, usar la primera inscripción o null
        const inscripcionRepresentativaPadre = inscripcionesPadre.length > 0 ? inscripcionesPadre[0] : null;

        // Crear un objeto "hijo" ficticio para el padre
        hijosFacturacion.unshift({
          hijo: {
            id: padre.id,
            nombre: padre.nombre,
            grado: { id: '', nombre: 'Personal del colegio', activo: true }
          } as Hijo,
          persona: {
            id: padre.id,
            nombre: padre.nombre,
            detalle: 'Personal del colegio',
            tipo: 'padre'
          },
          inscripcion: inscripcionRepresentativaPadre,
          diasFacturables,
          totalDias: diasFacturables.length,
          totalImporte,
          totalImporteSinDescuento: tieneDescuentoAsistencia80 || estaExentoPadre ? totalImporteSinDescuentoAsistencia : undefined,
          precioBaseSinDescuentos,
          desglose: {
            diasInscripcion,
            diasPuntuales,
            diasBaja,
            diasFestivos,
            diasInvitacion
          },
          tieneDescuentoAsistencia80,
          porcentajeDescuentoAsistencia80,
          porcentajeAsistencia,
          ahorroTotalDescuentos,
          estaExento: estaExentoPadre,
          motivoExencion: estaExentoPadre ? padre.motivo_exencion : undefined
        });
      }

      const totalGeneral = hijosFacturacion.reduce((sum, hijo) => sum + hijo.totalImporte, 0);
      const totalDias = hijosFacturacion.reduce((sum, hijo) => sum + hijo.totalDias, 0);
      const totalSinDescuentos = hijosFacturacion.reduce((sum, hijo) => sum + (hijo.precioBaseSinDescuentos || 0), 0);
      const ahorroTotalDescuentos = totalSinDescuentos - totalGeneral;

      return {
        mesSeleccionado: mes,
        hijosFacturacion,
        totalGeneral,
        totalDias,
        totalSinDescuentos,
        ahorroTotalDescuentos
      };

    } catch (err: any) {
      throw new Error(`Error calculando facturación: ${err.message}`);
    }
  };

  const [facturacion, setFacturacion] = useState<ResumenFacturacion | null>(null);

  const loadFacturacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const resultado = await calcularFacturacion(mesSeleccionado);
      setFacturacion(resultado);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacturacion();
  }, [mesSeleccionado, user.id]);

  return {
    facturacion,
    loading,
    error,
    mesSeleccionado,
    setMesSeleccionado,
    refetch: loadFacturacion
  };
}