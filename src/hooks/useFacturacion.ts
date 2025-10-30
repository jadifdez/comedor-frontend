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
  InscripcionComedorPadre
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
      // Cargar todos los datos necesarios
      const [hijosResult, inscripcionesResult, bajasResult, solicitudesResult, padreResult, inscripcionesPadreResult, invitacionesResult] = await Promise.all([
        supabase
          .from('hijos')
          .select(`*, grado:grados(*)`)
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

        supabase
          .from('padres')
          .select('*')
          .maybeSingle(),

        // IMPORTANTE: Incluir inscripciones de padres activas Y desactivadas que estuvieron activas durante el mes
        supabase
          .from('comedor_inscripciones_padres')
          .select('*')
          .or(`and(activo.eq.true,fecha_inicio.lte.${fechaFinMes}),and(activo.eq.false,fecha_fin.gte.${fechaInicioMes},fecha_fin.lte.${fechaFinMes})`),

        supabase
          .from('invitaciones_comedor')
          .select('*')
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

      // Obtener días laborables del mes
      const diasLaborables = await getDiasLaborablesMes(year, month);

      const hijosFacturacion: FacturacionHijo[] = [];

      const configuracionPrecios = await obtenerConfiguracionPrecios();

      // Procesar facturación para hijos
      for (const hijo of hijos) {
        // Buscar la inscripción que aplica para este mes (activa O desactivada durante el mes)
        const inscripcionActiva = inscripciones.find(i => i.hijo_id === hijo.id);

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

        // Contar días festivos que coincidan con la inscripción
        for (const festivo of festivosData || []) {
          const fechaFestivo = festivo.fecha;
          if (inscripcionActiva && estaEnRangoInscripcion(fechaFestivo, inscripcionActiva)) {
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
            if (inscripcionActiva && estaEnRangoInscripcion(fecha, inscripcionActiva)) {
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

            // Los días puntuales usan el mismo precio que la inscripción activa
            const precioPuntual = calcularPrecioPuntual(
              inscripcionActiva?.precio_diario || null
            );

            diasFacturables.push({
              fecha,
              tipo: 'puntual',
              precio: precioPuntual,
              descripcion: 'Comida puntual solicitada'
            });
            continue;
          }

          // Verificar si está en rango de inscripción
          if (inscripcionActiva && estaEnRangoInscripcion(fecha, inscripcionActiva)) {
            diasInscripcion++;
            // Usar el precio_diario de la inscripción, que ya tiene aplicados descuentos (personal + familia numerosa)
            diasFacturables.push({
              fecha,
              tipo: 'inscripcion',
              precio: inscripcionActiva.precio_diario,
              descripcion: 'Comida por inscripción'
            });
          }
        }

        // Calcular el precio base sin ningún descuento (precio estándar del comedor)
        let precioBaseSinDescuentos = 0;
        if (inscripcionActiva && inscripcionActiva.descuento_aplicado > 0) {
          // Revertir el descuento familiar para obtener el precio base
          const precioBasePorDia = inscripcionActiva.precio_diario / (1 - inscripcionActiva.descuento_aplicado / 100);
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

        const ahorroTotalDescuentos = precioBaseSinDescuentos - totalImporte;

        hijosFacturacion.push({
          hijo,
          inscripcion: inscripcionActiva || null,
          diasFacturables,
          totalDias: diasFacturables.length,
          totalImporte,
          totalImporteSinDescuento: tieneDescuentoAsistencia80 ? totalImporteSinDescuentoAsistencia : undefined,
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
          ahorroTotalDescuentos
        });
      }

      // Procesar facturación para el padre (si es personal del colegio)
      if (padre && padre.es_personal && inscripcionesPadre.length > 0) {
        // Buscar la inscripción que aplica para este mes (activa O desactivada durante el mes)
        const inscripcionActivaPadre = inscripcionesPadre[0]; // Ya filtramos en la consulta
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

        // Contar días festivos que coincidan con la inscripción del padre
        for (const festivo of festivosDataPadre || []) {
          const fechaFestivo = festivo.fecha;
          if (inscripcionActivaPadre) {
            const fechaDate = new Date(fechaFestivo);
            const diaSemana = fechaDate.getDay();
            const fechaInicio = new Date(inscripcionActivaPadre.fecha_inicio);
            const fechaFin = inscripcionActivaPadre.fecha_fin ? new Date(inscripcionActivaPadre.fecha_fin) : null;

            if (
              inscripcionActivaPadre.dias_semana.includes(diaSemana) &&
              fechaDate >= fechaInicio &&
              (!fechaFin || fechaDate <= fechaFin)
            ) {
              diasFestivos++;
              diasInscripcion++;
            }
          }
        }

        for (const fecha of diasLaborables) {
          // Verificar si tiene invitación para este día (prioridad máxima)
          if (tieneInvitacion(fecha, null, padre.id, invitaciones)) {
            diasInvitacion++;
            // Las invitaciones NO se facturan, por lo tanto NO se añaden a diasFacturables
            // Pero SÍ se cuentan en diasInscripcion si el padre estaba inscrito ese día
            if (inscripcionActivaPadre) {
              const fechaDate = new Date(fecha);
              const diaSemana = fechaDate.getDay();
              const fechaInicio = new Date(inscripcionActivaPadre.fecha_inicio);
              const fechaFin = inscripcionActivaPadre.fecha_fin ? new Date(inscripcionActivaPadre.fecha_fin) : null;

              if (
                inscripcionActivaPadre.dias_semana.includes(diaSemana) &&
                fechaDate >= fechaInicio &&
                (!fechaFin || fechaDate <= fechaFin)
              ) {
                diasInscripcion++;
              }
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
            // Los días puntuales del padre usan el mismo precio que su inscripción
            const precioPuntualPadre = inscripcionActivaPadre?.precio_diario || configuracionPrecios.precio_adulto;

            diasFacturables.push({
              fecha,
              tipo: 'puntual',
              precio: precioPuntualPadre,
              descripcion: 'Comida puntual solicitada (Personal del colegio)'
            });
            continue;
          }

          // Verificar si está en rango de inscripción (para padre)
          if (inscripcionActivaPadre) {
            const fechaDate = new Date(fecha);
            const diaSemana = fechaDate.getDay();
            const fechaInicio = new Date(inscripcionActivaPadre.fecha_inicio);
            const fechaFin = inscripcionActivaPadre.fecha_fin ? new Date(inscripcionActivaPadre.fecha_fin) : null;

            if (
              inscripcionActivaPadre.dias_semana.includes(diaSemana) &&
              fechaDate >= fechaInicio &&
              (!fechaFin || fechaDate <= fechaFin)
            ) {
              diasInscripcion++;
              diasFacturables.push({
                fecha,
                tipo: 'inscripcion',
                precio: inscripcionActivaPadre.precio_diario,
                descripcion: 'Comida por inscripción'
              });
            }
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

        const ahorroTotalDescuentos = precioBaseSinDescuentos - totalImporte;

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
          inscripcion: inscripcionActivaPadre || null,
          diasFacturables,
          totalDias: diasFacturables.length,
          totalImporte,
          totalImporteSinDescuento: tieneDescuentoAsistencia80 ? totalImporteSinDescuentoAsistencia : undefined,
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
          ahorroTotalDescuentos
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