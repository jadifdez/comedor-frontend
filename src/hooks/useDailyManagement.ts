import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DailyDiner {
  id: string;
  nombre: string;
  tipo: 'hijo' | 'padre' | 'externo';
  curso?: string;
  es_inscripcion: boolean;
  es_invitacion: boolean;
  es_alta_puntual: boolean;
  es_baja: boolean;
  motivo_invitacion?: string;
  tiene_eleccion: boolean;
  opcion_principal?: string;
  opcion_guarnicion?: string;
  tiene_dieta_blanda: boolean;
  tiene_menu_personalizado: boolean;
  padre_id?: string;
  hijo_id?: string;
  restricciones: string[];
  es_personal?: boolean;
  cancelado_ultimo_momento?: boolean;
  cancelacion_id?: string;
}

export interface MenuSummary {
  opcion_principal_id: string;
  opcion_principal: string;
  opcion_guarnicion_id: string;
  opcion_guarnicion: string;
  cantidad: number;
  comensales: string[];
}

export interface DietaBlanda {
  id: string;
  nombre: string;
  curso?: string;
  tipo: 'hijo' | 'padre';
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_dieta_blanda: string;
}

export interface Baja {
  id: string;
  nombre: string;
  curso?: string;
  tipo: 'hijo' | 'padre';
}

export interface Invitado {
  id: string;
  nombre: string;
  curso?: string;
  tipo: 'hijo' | 'padre' | 'externo';
  motivo: string;
}

export interface RestriccionDietetica {
  id: string;
  nombre: string;
  tipo: 'alergia' | 'restriccion';
}

export interface DailyData {
  fecha: string;
  dia_semana: number;
  es_festivo: boolean;
  nombre_festivo?: string;
  comensales: DailyDiner[];
  comensales_recurrentes: DailyDiner[];
  comensales_puntuales: DailyDiner[];
  total_comensales: number;
  total_inscritos: number;
  total_invitaciones: number;
  total_bajas: number;
  total_neto: number;
  bajas: Baja[];
  invitados: Invitado[];
  dietas_blandas: DietaBlanda[];
  menu_summary: MenuSummary[];
  sin_eleccion: DailyDiner[];
  menu_rancho: DailyDiner[];
  restricciones_activas: RestriccionDietetica[];
}

export function useDailyManagement(fecha: string) {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyData(fecha);
  }, [fecha]);

  const fetchDailyData = async (selectedDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const date = new Date(selectedDate + 'T00:00:00');
      const diaSemana = date.getDay();

      // Convertir fecha ISO (2025-10-22) a formato español (22/10/2025) para búsqueda de bajas
      const [year, month, day] = selectedDate.split('-');
      const fechaEspanol = `${day}/${month}/${year}`;

      const [
        inscripcionesResult,
        inscripcionesPadreResult,
        menusPersonalizadosResult,
        bajasResult,
        invitacionesResult,
        altasPuntualesResult,
        eleccionesResult,
        dietasBlandasResult,
        festivosResult,
        restriccionesResult,
        cancelacionesResult,
        restriccionesActivasResult
      ] = await Promise.all([
        supabase
          .from('comedor_inscripciones')
          .select(`
            *,
            hijo_details:hijos(
              id,
              nombre,
              grado:grados(nombre)
            )
          `)
          .eq('activo', true)
          .contains('dias_semana', [diaSemana]),

        supabase
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
          .contains('dias_semana', [diaSemana]),

        supabase
          .from('comedor_menupersonalizado')
          .select('hijo_id, padre_id')
          .eq('fecha', selectedDate),

        supabase
          .from('comedor_bajas')
          .select(`
            *,
            hijo_details:hijos(nombre, grado:grados(nombre)),
            padre:padres(nombre)
          `)
          .contains('dias', [fechaEspanol]),

        supabase
          .from('invitaciones_comedor')
          .select(`
            *,
            hijo:hijos(id, nombre, grado:grados(nombre)),
            padre:padres(id, nombre, es_personal)
          `)
          .eq('fecha', selectedDate),

        supabase
          .from('comedor_altaspuntuales')
          .select(`
            *,
            hijo:hijos(id, nombre, grado:grados(nombre)),
            padre:padres(id, nombre, es_personal)
          `)
          .eq('fecha', fechaEspanol)
          .eq('estado', 'aprobada'),

        supabase
          .from('comedor_menupersonalizado')
          .select(`
            *,
            hijo_details:hijos(nombre, grado:grados(nombre)),
            padre:padres(nombre, es_personal),
            opcion_principal:opciones_menu_principal(nombre),
            opcion_guarnicion:opciones_menu_guarnicion(nombre)
          `)
          .eq('fecha', selectedDate),

        supabase
          .from('comedor_dietablanda')
          .select(`
            *,
            hijo_details:hijos(nombre, grado:grados(nombre)),
            padre:padres(nombre, es_personal)
          `)
          .eq('fecha_dieta_blanda', selectedDate),

        supabase
          .from('dias_festivos')
          .select('*')
          .eq('fecha', selectedDate)
          .eq('activo', true)
          .maybeSingle(),

        supabase
          .from('hijos_restricciones_dieteticas')
          .select(`
            hijo_id,
            restriccion:restricciones_dieteticas(nombre)
          `),

        supabase
          .from('comedor_cancelaciones_ultimo_momento')
          .select('*')
          .eq('fecha', selectedDate),

        supabase
          .from('restricciones_dieteticas')
          .select('id, nombre, tipo')
          .eq('activo', true)
          .order('nombre', { ascending: true })
      ]);

      if (inscripcionesResult.error) throw inscripcionesResult.error;
      if (inscripcionesPadreResult.error) throw inscripcionesPadreResult.error;
      if (menusPersonalizadosResult.error) throw menusPersonalizadosResult.error;
      if (bajasResult.error) throw bajasResult.error;
      if (invitacionesResult.error) throw invitacionesResult.error;
      if (altasPuntualesResult.error) throw altasPuntualesResult.error;
      if (eleccionesResult.error) throw eleccionesResult.error;
      if (dietasBlandasResult.error) throw dietasBlandasResult.error;
      if (festivosResult.error) throw festivosResult.error;
      if (restriccionesResult.error) throw restriccionesResult.error;
      if (cancelacionesResult.error) throw cancelacionesResult.error;
      if (restriccionesActivasResult.error) throw restriccionesActivasResult.error;

      const inscripcionesRaw = inscripcionesResult.data || [];
      const inscripcionesPadreRaw = inscripcionesPadreResult.data || [];
      const menusPersonalizadosRaw = menusPersonalizadosResult.data || [];
      const bajas = bajasResult.data || [];
      const invitaciones = invitacionesResult.data || [];
      const altasPuntuales = altasPuntualesResult.data || [];
      const elecciones = eleccionesResult.data || [];
      const dietasBlandas = dietasBlandasResult.data || [];
      const festivo = festivosResult.data;
      const restriccionesData = restriccionesResult.data || [];
      const cancelaciones = cancelacionesResult.data || [];
      const restriccionesActivas = restriccionesActivasResult.data || [];

      // Filtrar inscripciones por fecha
      const inscripciones = inscripcionesRaw.filter(insc => {
        const fechaInicio = new Date(insc.fecha_inicio);
        const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin) : null;
        const fechaSeleccionada = new Date(selectedDate);

        return fechaInicio <= fechaSeleccionada &&
               (!fechaFin || fechaFin >= fechaSeleccionada);
      });

      const inscripcionesPadre = inscripcionesPadreRaw.filter(insc => {
        const fechaInicio = new Date(insc.fecha_inicio);
        const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin) : null;
        const fechaSeleccionada = new Date(selectedDate);

        return fechaInicio <= fechaSeleccionada &&
               (!fechaFin || fechaFin >= fechaSeleccionada);
      });

      const restriccionesPorHijo = new Map<string, string[]>();
      restriccionesData.forEach((r: any) => {
        if (!restriccionesPorHijo.has(r.hijo_id)) {
          restriccionesPorHijo.set(r.hijo_id, []);
        }
        restriccionesPorHijo.get(r.hijo_id)!.push(r.restriccion.nombre);
      });

      const menusPersonalizadosSet = new Set<string>();
      menusPersonalizadosRaw.forEach((m: any) => {
        if (m.hijo_id) menusPersonalizadosSet.add(`hijo_${m.hijo_id}`);
        if (m.padre_id) menusPersonalizadosSet.add(`padre_${m.padre_id}`);
      });

      const tieneMenuPersonalizado = (hijoId?: string, padreId?: string): boolean => {
        if (hijoId && menusPersonalizadosSet.has(`hijo_${hijoId}`)) return true;
        if (padreId && menusPersonalizadosSet.has(`padre_${padreId}`)) return true;
        return false;
      };

      const bajasHijoIds = new Set(bajas.map(b => b.hijo_id));
      const bajasPadreIds = new Set(bajas.map(b => b.padre_id).filter(Boolean));

      // Crear mapas de cancelaciones
      const cancelacionesHijos = new Map(
        cancelaciones
          .filter(c => c.hijo_id)
          .map(c => [c.hijo_id, c.id])
      );
      const cancelacionesPadres = new Map(
        cancelaciones
          .filter(c => c.padre_id)
          .map(c => [c.padre_id, c.id])
      );

      const comensales: DailyDiner[] = [];

      inscripciones.forEach(insc => {
        if (!bajasHijoIds.has(insc.hijo_id)) {
          const eleccion = elecciones.find(e => e.hijo_id === insc.hijo_id);
          const dietaBlanda = dietasBlandas.find(d => d.hijo_id === insc.hijo_id && d.estado === 'aprobada');

          comensales.push({
            id: insc.hijo_id,
            nombre: insc.hijo_details?.nombre || 'Desconocido',
            tipo: 'hijo',
            curso: insc.hijo_details?.grado?.nombre,
            es_inscripcion: true,
            es_invitacion: false,
            es_alta_puntual: false,
            es_baja: false,
            tiene_eleccion: !!eleccion,
            opcion_principal: eleccion?.opcion_principal?.nombre,
            opcion_guarnicion: eleccion?.opcion_guarnicion?.nombre,
            tiene_dieta_blanda: !!dietaBlanda,
            tiene_menu_personalizado: tieneMenuPersonalizado(insc.hijo_id, undefined),
            hijo_id: insc.hijo_id,
            restricciones: restriccionesPorHijo.get(insc.hijo_id) || [],
            es_personal: false,
            cancelado_ultimo_momento: cancelacionesHijos.has(insc.hijo_id),
            cancelacion_id: cancelacionesHijos.get(insc.hijo_id)
          });
        }
      });

      inscripcionesPadre.forEach(insc => {
        if (!bajasPadreIds.has(insc.padre_id)) {
          const eleccion = elecciones.find(e => e.padre_id === insc.padre_id);
          const dietaBlanda = dietasBlandas.find(d => d.padre_id === insc.padre_id && d.estado === 'aprobada');

          comensales.push({
            id: insc.padre_id,
            nombre: insc.padre?.nombre || 'Desconocido',
            tipo: 'padre',
            es_inscripcion: true,
            es_invitacion: false,
            es_alta_puntual: false,
            es_baja: false,
            tiene_eleccion: !!eleccion,
            opcion_principal: eleccion?.opcion_principal?.nombre,
            opcion_guarnicion: eleccion?.opcion_guarnicion?.nombre,
            tiene_dieta_blanda: !!dietaBlanda,
            tiene_menu_personalizado: tieneMenuPersonalizado(undefined, insc.padre_id),
            padre_id: insc.padre_id,
            restricciones: [],
            es_personal: insc.padre?.es_personal || false,
            cancelado_ultimo_momento: cancelacionesPadres.has(insc.padre_id),
            cancelacion_id: cancelacionesPadres.get(insc.padre_id)
          });
        }
      });

      invitaciones.forEach(inv => {
        const hijoId = inv.hijo_id;
        const padreId = inv.padre_id;

        const yaInscrito = comensales.find(c =>
          (hijoId && c.hijo_id === hijoId) || (padreId && c.padre_id === padreId)
        );

        if (!yaInscrito) {
          const eleccion = elecciones.find(e =>
            (hijoId && e.hijo_id === hijoId) || (padreId && e.padre_id === padreId)
          );
          const dietaBlanda = dietasBlandas.find(d =>
            ((hijoId && d.hijo_id === hijoId) || (padreId && d.padre_id === padreId)) &&
            d.estado === 'aprobada'
          );

          const canceladoUltimoMomento = inv.hijo_id
            ? cancelacionesHijos.has(inv.hijo_id)
            : inv.padre_id
            ? cancelacionesPadres.has(inv.padre_id)
            : false;

          const cancelacionId = inv.hijo_id
            ? cancelacionesHijos.get(inv.hijo_id)
            : inv.padre_id
            ? cancelacionesPadres.get(inv.padre_id)
            : undefined;

          comensales.push({
            id: inv.id,
            nombre: inv.hijo ? inv.hijo.nombre : inv.padre ? inv.padre.nombre : inv.nombre_completo || 'Desconocido',
            tipo: inv.hijo_id ? 'hijo' : inv.padre_id ? 'padre' : 'externo',
            curso: inv.hijo?.grado?.nombre,
            es_inscripcion: false,
            es_invitacion: true,
            es_alta_puntual: false,
            es_baja: false,
            motivo_invitacion: inv.motivo,
            tiene_eleccion: !!eleccion,
            opcion_principal: eleccion?.opcion_principal?.nombre,
            opcion_guarnicion: eleccion?.opcion_guarnicion?.nombre,
            tiene_dieta_blanda: !!dietaBlanda,
            tiene_menu_personalizado: tieneMenuPersonalizado(inv.hijo_id, inv.padre_id),
            hijo_id: inv.hijo_id || undefined,
            padre_id: inv.padre_id || undefined,
            restricciones: hijoId ? (restriccionesPorHijo.get(hijoId) || []) : [],
            es_personal: inv.padre?.es_personal || false,
            cancelado_ultimo_momento: canceladoUltimoMomento,
            cancelacion_id: cancelacionId
          });
        }
      });

      altasPuntuales.forEach(alta => {
        const hijoId = alta.hijo_id;
        const padreId = alta.padre_id;

        const yaInscrito = comensales.find(c =>
          (hijoId && c.hijo_id === hijoId) || (padreId && c.padre_id === padreId)
        );

        if (!yaInscrito) {
          const eleccion = elecciones.find(e =>
            (hijoId && e.hijo_id === hijoId) || (padreId && e.padre_id === padreId)
          );
          const dietaBlanda = dietasBlandas.find(d =>
            ((hijoId && d.hijo_id === hijoId) || (padreId && d.padre_id === padreId)) &&
            d.estado === 'aprobada'
          );

          const canceladoUltimoMomento = alta.hijo_id
            ? cancelacionesHijos.has(alta.hijo_id)
            : alta.padre_id
            ? cancelacionesPadres.has(alta.padre_id)
            : false;

          const cancelacionId = alta.hijo_id
            ? cancelacionesHijos.get(alta.hijo_id)
            : alta.padre_id
            ? cancelacionesPadres.get(alta.padre_id)
            : undefined;

          comensales.push({
            id: alta.id,
            nombre: alta.hijo ? alta.hijo.nombre : alta.padre ? alta.padre.nombre : alta.hijo || 'Desconocido',
            tipo: alta.hijo_id ? 'hijo' : 'padre',
            curso: alta.hijo?.grado?.nombre || alta.curso,
            es_inscripcion: false,
            es_invitacion: false,
            es_alta_puntual: true,
            es_baja: false,
            motivo_invitacion: 'Alta puntual (se factura)',

            tiene_eleccion: !!eleccion,
            opcion_principal: eleccion?.opcion_principal?.nombre,
            opcion_guarnicion: eleccion?.opcion_guarnicion?.nombre,
            tiene_dieta_blanda: !!dietaBlanda,
            tiene_menu_personalizado: tieneMenuPersonalizado(alta.hijo_id, alta.padre_id),
            hijo_id: alta.hijo_id || undefined,
            padre_id: alta.padre_id || undefined,
            restricciones: hijoId ? (restriccionesPorHijo.get(hijoId) || []) : [],
            es_personal: alta.padre?.es_personal || false,
            cancelado_ultimo_momento: canceladoUltimoMomento,
            cancelacion_id: cancelacionId
          });
        }
      });

      elecciones.forEach(eleccion => {
        const hijoId = eleccion.hijo_id;
        const padreId = eleccion.padre_id;

        const yaEnLista = comensales.find(c =>
          (hijoId && c.hijo_id === hijoId) || (padreId && c.padre_id === padreId)
        );

        if (!yaEnLista) {
          const dietaBlanda = dietasBlandas.find(d =>
            ((hijoId && d.hijo_id === hijoId) || (padreId && d.padre_id === padreId)) &&
            d.estado === 'aprobada'
          );

          comensales.push({
            id: eleccion.id,
            nombre: eleccion.hijo_details?.nombre || (eleccion as any).padre?.nombre || 'Desconocido',
            tipo: hijoId ? 'hijo' : 'padre',
            curso: eleccion.hijo_details?.grado?.nombre,
            es_inscripcion: false,
            es_invitacion: false,
            es_alta_puntual: false,
            es_baja: false,
            tiene_eleccion: true,
            opcion_principal: eleccion.opcion_principal?.nombre,
            opcion_guarnicion: eleccion.opcion_guarnicion?.nombre,
            tiene_dieta_blanda: !!dietaBlanda,
            tiene_menu_personalizado: tieneMenuPersonalizado(hijoId, padreId),
            hijo_id: hijoId || undefined,
            padre_id: padreId || undefined,
            restricciones: hijoId ? (restriccionesPorHijo.get(hijoId) || []) : [],
            es_personal: (eleccion as any).padre?.es_personal || false
          });
        }
      });

      const menuSummaryMap = new Map<string, MenuSummary>();
      comensales.forEach(comensal => {
        if (comensal.tiene_eleccion && comensal.opcion_principal && comensal.opcion_guarnicion) {
          const key = `${comensal.opcion_principal}|${comensal.opcion_guarnicion}`;
          if (!menuSummaryMap.has(key)) {
            menuSummaryMap.set(key, {
              opcion_principal_id: '',
              opcion_principal: comensal.opcion_principal,
              opcion_guarnicion_id: '',
              opcion_guarnicion: comensal.opcion_guarnicion,
              cantidad: 0,
              comensales: []
            });
          }
          const summary = menuSummaryMap.get(key)!;
          summary.cantidad++;
          summary.comensales.push(comensal.nombre);
        }
      });

      const sinEleccion = comensales.filter(c => !c.tiene_eleccion && !c.tiene_dieta_blanda && c.tipo === 'hijo');

      const menuRancho = sinEleccion;

      const dietasBlandasFormatted: DietaBlanda[] = dietasBlandas
        .filter(d => d.estado === 'aprobada')
        .map(d => ({
          id: d.id,
          nombre: d.hijo_details?.nombre || d.padre?.nombre || 'Desconocido',
          curso: d.hijo_details?.grado?.nombre,
          tipo: d.hijo_id ? 'hijo' : 'padre',
          estado: d.estado,
          fecha_dieta_blanda: d.fecha_dieta_blanda
        }));

      const bajasFormatted: Baja[] = bajas.map(b => ({
        id: b.id,
        nombre: b.hijo_details?.nombre || (b as any).padre?.nombre || b.hijo || 'Desconocido',
        curso: b.hijo_details?.grado?.nombre,
        tipo: b.hijo_id ? 'hijo' : 'padre'
      }));

      const invitadosFormatted: Invitado[] = invitaciones.map(inv => ({
        id: inv.id,
        nombre: inv.hijo ? inv.hijo.nombre : inv.padre ? inv.padre.nombre : inv.nombre_completo || 'Desconocido',
        curso: inv.hijo?.grado?.nombre,
        tipo: inv.hijo_id ? 'hijo' : inv.padre_id ? 'padre' : 'externo',
        motivo: inv.motivo || 'Sin motivo especificado'
      }));

      const sortComensales = (a: DailyDiner, b: DailyDiner): number => {
        if (a.tipo === 'padre' && b.tipo !== 'padre') return -1;
        if (a.tipo !== 'padre' && b.tipo === 'padre') return 1;
        if (a.tipo === 'padre' && b.tipo === 'padre') {
          return a.nombre.localeCompare(b.nombre);
        }
        if (a.tipo === 'externo' && b.tipo !== 'externo') return 1;
        if (a.tipo !== 'externo' && b.tipo === 'externo') return -1;
        if (a.curso && b.curso && a.curso !== b.curso) {
          return a.curso.localeCompare(b.curso);
        }
        return a.nombre.localeCompare(b.nombre);
      };

      const comensalesRecurrentes = comensales
        .filter(c => c.es_inscripcion)
        .sort(sortComensales);

      const comensalesPuntuales = comensales
        .filter(c => (c.es_invitacion || c.es_alta_puntual) && !c.es_inscripcion)
        .sort(sortComensales);

      const dailyData: DailyData = {
        fecha: selectedDate,
        dia_semana: diaSemana,
        es_festivo: !!festivo,
        nombre_festivo: festivo?.nombre,
        comensales,
        comensales_recurrentes: comensalesRecurrentes,
        comensales_puntuales: comensalesPuntuales,
        total_comensales: comensales.length,
        total_inscritos: comensales.filter(c => c.es_inscripcion).length,
        total_invitaciones: comensales.filter(c => c.es_invitacion).length,
        total_bajas: bajas.length,
        total_neto: comensales.length,
        bajas: bajasFormatted,
        invitados: invitadosFormatted,
        dietas_blandas: dietasBlandasFormatted,
        menu_summary: Array.from(menuSummaryMap.values()),
        sin_eleccion: sinEleccion,
        menu_rancho: menuRancho,
        restricciones_activas: restriccionesActivas
      };

      setData(dailyData);
    } catch (err) {
      console.error('Error fetching daily data:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: () => fetchDailyData(fecha) };
}
