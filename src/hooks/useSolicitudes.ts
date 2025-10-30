import { useState, useEffect } from 'react';
import { supabase, SolicitudComida, Hijo, InscripcionComedor, Padre } from '../lib/supabase';
import { InscripcionPadre } from './useInscripcionesPadres';
import { User } from '@supabase/supabase-js';
import { parseBajaDate, getMinCancellationDate, formatDateForComparison } from '../utils/dateUtils';

export function useSolicitudes(user: User, padre?: Padre | null, inscripcionesPadre?: InscripcionPadre[]) {
  const [solicitudes, setSolicitudes] = useState<SolicitudComida[]>([]);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionComedor[]>([]);
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
      setHijos(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Cargar inscripciones de comedor
  const loadInscripciones = async (hijosIds: string[]) => {
    try {
      if (hijosIds.length === 0) {
        setInscripciones([]);
        return;
      }

      const { data, error } = await supabase
        .from('comedor_inscripciones')
        .select('*')
        .in('hijo_id', hijosIds)
        .eq('activo', true);

      if (error) throw error;
      setInscripciones(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Cargar solicitudes del usuario
  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comedor_altaspuntuales')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva solicitud
  const createSolicitud = async (personaId: string, fechas: string[]) => {
    try {
      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === personaId;

      if (isPadre) {
        // Crear solicitudes para el padre personal
        if (!padre) {
          throw new Error('Padre no encontrado');
        }

        const solicitudesToInsert = fechas.map(fecha => {
          const date = new Date(fecha);
          const fechaFormateada = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          return {
            hijo: padre.nombre,
            padre_id: padre.id,
            curso: 'Personal del colegio',
            fecha: fechaFormateada,
            user_id: user.id,
            estado: 'aprobada' as const,
          };
        });

        const { data, error } = await supabase
          .from('comedor_altaspuntuales')
          .insert(solicitudesToInsert)
          .select('*');

        if (error) throw error;

        setSolicitudes(prev => [...(data || []), ...prev]);
        return data;
      } else {
        // Crear solicitudes para un hijo
        const selectedHijo = hijos.find(h => h.id === personaId);
        if (!selectedHijo) {
          throw new Error('Hijo no encontrado');
        }

        const solicitudesToInsert = fechas.map(fecha => {
          const date = new Date(fecha);
          const fechaFormateada = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });

          return {
            hijo: selectedHijo.nombre,
            hijo_id: personaId,
            curso: selectedHijo.grado?.nombre || '',
            fecha: fechaFormateada,
            user_id: user.id,
            estado: 'aprobada' as const,
          };
        });

        const { data, error } = await supabase
          .from('comedor_altaspuntuales')
          .insert(solicitudesToInsert)
          .select('*');

        if (error) throw error;

        setSolicitudes(prev => [...(data || []), ...prev]);
        return data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const canCancelSolicitud = (solicitud: SolicitudComida): { canCancel: boolean; reason?: string; deadlineDate?: string } => {
    if (!solicitud.fecha) {
      return { canCancel: false, reason: 'Solicitud sin fecha válida' };
    }

    const fechaSolicitud = parseBajaDate(solicitud.fecha);
    const minDate = getMinCancellationDate(diasAntelacion);

    const fechaSolicitudFormatted = formatDateForComparison(fechaSolicitud);
    const minDateFormatted = formatDateForComparison(minDate);

    if (fechaSolicitudFormatted < minDateFormatted) {
      const deadlineDate = new Date(fechaSolicitud);
      deadlineDate.setDate(deadlineDate.getDate() - diasAntelacion - 1);
      return {
        canCancel: false,
        reason: `Esta solicitud requiere ${diasAntelacion} día${diasAntelacion !== 1 ? 's' : ''} de antelación`,
        deadlineDate: deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      };
    }

    return { canCancel: true };
  };

  const deleteSolicitud = async (id: string) => {
    try {
      const solicitud = solicitudes.find(s => s.id === id);
      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      const validation = canCancelSolicitud(solicitud);
      if (!validation.canCancel) {
        const errorMsg = validation.deadlineDate
          ? `${validation.reason}. Fecha límite para cancelar: ${validation.deadlineDate}`
          : validation.reason;
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('comedor_altaspuntuales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSolicitudes(prev => prev.filter(solicitud => solicitud.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadConfiguracion(),
          loadSolicitudes()
        ]);

        await loadHijos();

        const hijosData = await supabase
          .from('hijos')
          .select(`
            *,
            grado:grados(*),
            padres!inner(email)
          `)
          .eq('padres.email', user.email)
          .eq('activo', true)
          .order('nombre');

        if (hijosData.data && hijosData.data.length > 0) {
          setHijos(hijosData.data);
          const hijosIds = hijosData.data.map(h => h.id);
          await loadInscripciones(hijosIds);
        }
      } catch (error) {
        console.error('Error initializing useSolicitudes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user.id]);

  return {
    solicitudes,
    hijos,
    inscripciones,
    loading,
    error,
    diasAntelacion,
    createSolicitud,
    deleteSolicitud,
    canCancelSolicitud,
    refetch: loadSolicitudes,
  };
}