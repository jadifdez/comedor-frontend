import { useState, useEffect } from 'react';
import { supabase, EleccionMenu, Hijo, OpcionMenuPrincipal, OpcionMenuGuarnicion, Padre } from '../lib/supabase';
import { InscripcionPadre } from './useInscripcionesPadres';
import { User } from '@supabase/supabase-js';
import { parseBajaDate, getMinCancellationDate, formatDateForComparison } from '../utils/dateUtils';

interface OpcionUnificada {
  id: string;
  nombre: string;
  detalle?: string;
  tipo: 'hijo' | 'padre';
}

export function useMenuElecciones(user: User, padre?: Padre | null, inscripcionesPadre?: InscripcionPadre[]) {
  const [elecciones, setElecciones] = useState<EleccionMenu[]>([]);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [personasUnificadas, setPersonasUnificadas] = useState<OpcionUnificada[]>([]);
  const [opcionesPrincipales, setOpcionesPrincipales] = useState<OpcionMenuPrincipal[]>([]);
  const [opcionesGuarnicion, setOpcionesGuarnicion] = useState<OpcionMenuGuarnicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diasAntelacion, setDiasAntelacion] = useState<number>(2);

  const loadConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_precios')
        .select('dias_antelacion')
        .eq('activo', true)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setDiasAntelacion(data[0].dias_antelacion || 2);
      }
    } catch (err: any) {
      console.error('Error loading configuracion:', err);
      setDiasAntelacion(2);
    }
  };

  const loadHijos = async () => {
    try {
      console.log('[useMenuElecciones] Iniciando carga de hijos para email:', user.email);

      const { data, error } = await supabase
        .from('hijos')
        .select(`
          *,
          grado:grados(*),
          padres!inner(email)
        `)
        .eq('padres.email', user.email)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;

      console.log('[useMenuElecciones] Total hijos encontrados:', data?.length || 0);
      console.log('[useMenuElecciones] Hijos:', data?.map(h => ({ nombre: h.nombre, grado: h.grado?.nombre })));

      // Filtrar solo hijos cuyos grados permiten elección de menú
      const hijosConMenu = (data || []).filter(hijo => {
        const tieneOpcion = hijo.grado?.tiene_opcion_menu === true;
        console.log(`[useMenuElecciones] ${hijo.nombre} - Grado: ${hijo.grado?.nombre}, tiene_opcion_menu: ${hijo.grado?.tiene_opcion_menu}, incluido: ${tieneOpcion}`);
        return tieneOpcion;
      });

      console.log('[useMenuElecciones] Hijos con opción de menú:', hijosConMenu.length, hijosConMenu.map(h => h.nombre));
      setHijos(hijosConMenu);

      // Obtener inscripciones activas - CORREGIDO: nombre correcto de la tabla
      const { data: inscripcionesData, error: inscError } = await supabase
        .from('comedor_inscripciones')
        .select('hijo_id')
        .eq('activo', true);

      if (inscError) {
        console.error('[useMenuElecciones] Error al obtener inscripciones:', inscError);
      }

      console.log('[useMenuElecciones] Inscripciones activas encontradas:', inscripcionesData?.length || 0);
      console.log('[useMenuElecciones] IDs de hijos con inscripción activa:', inscripcionesData?.map(i => i.hijo_id));

      const hijosConInscripcionActiva = new Set(inscripcionesData?.map(i => i.hijo_id) || []);

      // Crear lista unificada de personas que pueden elegir menú (solo con inscripciones activas)
      const personasHijos: OpcionUnificada[] = hijosConMenu
        .filter(hijo => {
          const tieneInscripcion = hijosConInscripcionActiva.has(hijo.id);
          console.log(`[useMenuElecciones] ${hijo.nombre} - tiene inscripción activa: ${tieneInscripcion}`);
          return tieneInscripcion;
        })
        .map(hijo => ({
          id: hijo.id,
          nombre: hijo.nombre,
          detalle: hijo.grado?.nombre,
          tipo: 'hijo' as const
        }));

      console.log('[useMenuElecciones] Personas hijos finales:', personasHijos.length, personasHijos.map(p => p.nombre));

      // Debug inscripciones padre
      console.log('[useMenuElecciones] inscripcionesPadre:', inscripcionesPadre);
      console.log('[useMenuElecciones] padre:', padre);
      console.log('[useMenuElecciones] padre?.id:', padre?.id);
      console.log('[useMenuElecciones] inscripciones activas:', inscripcionesPadre?.filter(i => i.activo));

      // Solo incluir al padre si tiene inscripciones activas
      const tieneInscripcionActiva = inscripcionesPadre && inscripcionesPadre.some(i => i.activo);
      console.log('[useMenuElecciones] tieneInscripcionActiva:', tieneInscripcionActiva);

      const personasPadre: OpcionUnificada[] = tieneInscripcionActiva && padre?.id
        ? [{
            id: padre.id,
            nombre: padre.nombre || '',
            detalle: 'Personal del colegio',
            tipo: 'padre' as const
          }]
        : [];

      console.log('[useMenuElecciones] Personas padre finales:', personasPadre.length, personasPadre);

      const todasPersonas = [...personasPadre, ...personasHijos];
      console.log('[useMenuElecciones] Total personas disponibles para elegir menú:', todasPersonas.length);

      setPersonasUnificadas(todasPersonas);
    } catch (err: any) {
      console.error('[useMenuElecciones] Error cargando hijos:', err);
      setError(err.message);
    }
  };

  // Cargar opciones de menú principal
  const loadOpcionesPrincipales = async () => {
    try {
      const { data, error } = await supabase
        .from('opciones_menu_principal')
        .select('*')
        .eq('activo', true)
        .order('dia_semana, orden');

      if (error) {
        // Si las tablas no existen, usar datos mock
        console.warn('Tablas de menú no existen, usando datos mock');
        setOpcionesPrincipales([]);
        return;
      }
      setOpcionesPrincipales(data || []);
    } catch (err: any) {
      console.warn('Error cargando opciones principales:', err.message);
      setOpcionesPrincipales([]);
    }
  };

  // Cargar opciones de guarnición
  const loadOpcionesGuarnicion = async () => {
    try {
      const { data, error } = await supabase
        .from('opciones_menu_guarnicion')
        .select('*')
        .eq('activo', true)
        .order('orden');

      if (error) {
        // Si las tablas no existen, usar datos mock
        console.warn('Tablas de menú no existen, usando datos mock');
        setOpcionesGuarnicion([]);
        return;
      }
      setOpcionesGuarnicion(data || []);
    } catch (err: any) {
      console.warn('Error cargando opciones guarnición:', err.message);
      setOpcionesGuarnicion([]);
    }
  };

  // Cargar elecciones existentes
  const loadElecciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comedor_menupersonalizado')
        .select(`
          *,
          hijo_details:hijos(
            id,
            nombre,
            grado:grados(nombre)
          ),
          padre_details:padres(
            id,
            nombre
          ),
          opcion_principal:opciones_menu_principal(
            id,
            nombre
          ),
          opcion_guarnicion:opciones_menu_guarnicion(
            id,
            nombre
          )
        `)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (error) {
        // Si las tablas no existen, usar array vacío
        console.warn('Tablas de menú no existen, usando array vacío');
        setElecciones([]);
        return;
      }
      setElecciones(data || []);
    } catch (err: any) {
      console.warn('Error cargando elecciones:', err.message);
      setElecciones([]);
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar elección de menú
  const saveEleccionMenu = async (
    personaId: string,
    fecha: string,
    opcionPrincipalId: string,
    opcionGuarnicionId: string
  ) => {
    try {
      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === personaId;

      const eleccionData = isPadre
        ? {
            padre_id: personaId,
            fecha,
            opcion_principal_id: opcionPrincipalId,
            opcion_guarnicion_id: opcionGuarnicionId,
            user_id: user.id,
          }
        : {
            hijo_id: personaId,
            fecha,
            opcion_principal_id: opcionPrincipalId,
            opcion_guarnicion_id: opcionGuarnicionId,
            user_id: user.id,
          };

      const { data, error } = await supabase
        .from('comedor_menupersonalizado')
        .upsert(eleccionData)
        .select(`
          *,
          hijo_details:hijos(
            id,
            nombre,
            grado:grados(nombre)
          ),
          padre_details:padres(
            id,
            nombre
          ),
          opcion_principal:opciones_menu_principal(
            id,
            nombre
          ),
          opcion_guarnicion:opciones_menu_guarnicion(
            id,
            nombre
          )
        `);

      if (error) throw error;

      // Actualizar la lista local con los datos completos
      if (data && data[0]) {
        setElecciones(prev => {
          const filtered = prev.filter(e => !(
            (e.hijo_id === personaId || e.padre_id === personaId) &&
            e.fecha === fecha
          ));
          return [data[0], ...filtered];
        });
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const canCancelEleccionMenu = (eleccion: EleccionMenu): { canCancel: boolean; reason?: string; deadlineDate?: string } => {
    if (!eleccion.fecha) {
      return { canCancel: false, reason: 'Elección sin fecha válida' };
    }

    const fechaEleccion = parseBajaDate(eleccion.fecha);
    const minDate = getMinCancellationDate(diasAntelacion);

    const fechaEleccionFormatted = formatDateForComparison(fechaEleccion);
    const minDateFormatted = formatDateForComparison(minDate);

    if (fechaEleccionFormatted < minDateFormatted) {
      const deadlineDate = new Date(fechaEleccion);
      deadlineDate.setDate(deadlineDate.getDate() - diasAntelacion - 1);
      return {
        canCancel: false,
        reason: `Esta elección requiere ${diasAntelacion} día${diasAntelacion !== 1 ? 's' : ''} de antelación`,
        deadlineDate: deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      };
    }

    return { canCancel: true };
  };

  const deleteEleccionMenu = async (id: string) => {
    try {
      const eleccion = elecciones.find(e => e.id === id);
      if (!eleccion) {
        throw new Error('Elección no encontrada');
      }

      const validation = canCancelEleccionMenu(eleccion);
      if (!validation.canCancel) {
        const errorMsg = validation.deadlineDate
          ? `${validation.reason}. Fecha límite para cancelar: ${validation.deadlineDate}`
          : validation.reason;
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('comedor_menupersonalizado')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setElecciones(prev => prev.filter(eleccion => eleccion.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Obtener opciones principales para un día específico
  const getOpcionesPorDia = (diaSemana: number) => {
    return opcionesPrincipales.filter(opcion => opcion.dia_semana === diaSemana);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          loadConfiguracion(),
          loadHijos(),
          loadOpcionesPrincipales(),
          loadOpcionesGuarnicion(),
          loadElecciones()
        ]);
      } catch (error) {
        console.error('Error initializing useMenuElecciones:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.id, padre?.id, inscripcionesPadre]);

  return {
    elecciones,
    hijos,
    personasUnificadas,
    opcionesPrincipales,
    opcionesGuarnicion,
    loading,
    error,
    diasAntelacion,
    saveEleccionMenu,
    deleteEleccionMenu,
    canCancelEleccionMenu,
    getOpcionesPorDia,
    refetch: loadElecciones,
  };
}