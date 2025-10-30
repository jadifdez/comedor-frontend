import { useState, useEffect } from 'react';
import { supabase, Enfermedad, Hijo, Padre, InscripcionComedorPadre } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { parseBajaDate, getMinCancellationDate, formatDateForComparison } from '../utils/dateUtils';

export function useEnfermedades(user: User, padre?: Padre | null, inscripcionesPadre?: InscripcionComedorPadre[]) {
  const [enfermedades, setEnfermedades] = useState<Enfermedad[]>([]);
  const [hijos, setHijos] = useState<Hijo[]>([]);
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
          grado:grados(*)
        `)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setHijos(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Cargar enfermedades del usuario
  const loadEnfermedades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comedor_dietablanda')
        .select(`
          *,
          hijo_details:hijos(*)
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setEnfermedades(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva enfermedad
  const createEnfermedad = async (enfermedadData: {
    hijoId: string;
    fechasDietaBlanda: string[];
  }) => {
    try {
      // Verificar si es padre o hijo
      const isPadre = padre?.id === enfermedadData.hijoId;

      let nombre = '';
      let curso = '';

      if (isPadre) {
        nombre = padre?.nombre || '';
        curso = 'Personal del colegio';
      } else {
        const selectedHijo = hijos.find(h => h.id === enfermedadData.hijoId);
        if (!selectedHijo) {
          throw new Error('Hijo no encontrado');
        }
        nombre = selectedHijo.nombre;
        curso = selectedHijo.grado?.nombre || '';
      }

      // Verificar si ya existen solicitudes para las fechas seleccionadas
      const fechasExistentes = new Set();
      for (const fecha of enfermedadData.fechasDietaBlanda) {
        const fechaFormateada = new Date(fecha).toISOString().split('T')[0];

        let query = supabase
          .from('comedor_dietablanda')
          .select('fecha_dieta_blanda')
          .eq('fecha_dieta_blanda', fechaFormateada);

        if (isPadre) {
          query = query.eq('padre_id', enfermedadData.hijoId);
        } else {
          query = query.eq('hijo_id', enfermedadData.hijoId);
        }

        const { data: existingRequests, error: checkError } = await query;

        if (checkError) throw checkError;

        if (existingRequests && existingRequests.length > 0) {
          const fechaDisplay = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          fechasExistentes.add(fechaDisplay);
        }
      }

      if (fechasExistentes.size > 0) {
        const fechasTexto = Array.from(fechasExistentes).join(', ');
        throw new Error(`Ya existe una solicitud de dieta blanda para: ${fechasTexto}`);
      }

      // Crear una enfermedad por cada fecha seleccionada
      const enfermedadesToInsert = enfermedadData.fechasDietaBlanda.map(fecha => {
        const date = new Date(fecha);
        const fechaFormateada = date.toISOString().split('T')[0];

        const record: any = {
          hijo: nombre,
          curso: curso,
          fecha_dieta_blanda: fechaFormateada,
          user_id: user.id,
          estado: 'aprobada' as const,
        };

        if (isPadre) {
          record.padre_id = enfermedadData.hijoId;
        } else {
          record.hijo_id = enfermedadData.hijoId;
        }

        return record;
      });

      const { data, error } = await supabase
        .from('comedor_dietablanda')
        .insert(enfermedadesToInsert)
        .select(`
          *,
          hijo_details:hijos(*)
        `);

      if (error) throw error;

      // Actualizar la lista local
      setEnfermedades(prev => [...(data || []), ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const canCancelEnfermedad = (enfermedad: Enfermedad): { canCancel: boolean; reason?: string; deadlineDate?: string } => {
    if (!enfermedad.fecha_dieta_blanda) {
      return { canCancel: false, reason: 'Solicitud sin fecha válida' };
    }

    const fechaEnfermedad = parseBajaDate(enfermedad.fecha_dieta_blanda);
    const minDate = getMinCancellationDate(diasAntelacion);

    const fechaEnfermedadFormatted = formatDateForComparison(fechaEnfermedad);
    const minDateFormatted = formatDateForComparison(minDate);

    if (fechaEnfermedadFormatted < minDateFormatted) {
      const deadlineDate = new Date(fechaEnfermedad);
      deadlineDate.setDate(deadlineDate.getDate() - diasAntelacion - 1);
      return {
        canCancel: false,
        reason: `Esta solicitud requiere ${diasAntelacion} día${diasAntelacion !== 1 ? 's' : ''} de antelación`,
        deadlineDate: deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      };
    }

    return { canCancel: true };
  };

  const deleteEnfermedad = async (id: string) => {
    try {
      const enfermedad = enfermedades.find(e => e.id === id);
      if (!enfermedad) {
        throw new Error('Solicitud no encontrada');
      }

      const validation = canCancelEnfermedad(enfermedad);
      if (!validation.canCancel) {
        const errorMsg = validation.deadlineDate
          ? `${validation.reason}. Fecha límite para cancelar: ${validation.deadlineDate}`
          : validation.reason;
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('comedor_dietablanda')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEnfermedades(prev => prev.filter(enfermedad => enfermedad.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          loadConfiguracion(),
          loadHijos(),
          loadEnfermedades()
        ]);
      } catch (error) {
        console.error('Error initializing useEnfermedades:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user.id]);

  return {
    enfermedades,
    hijos,
    loading,
    error,
    diasAntelacion,
    createEnfermedad,
    deleteEnfermedad,
    canCancelEnfermedad,
    refetch: loadEnfermedades,
  };
}