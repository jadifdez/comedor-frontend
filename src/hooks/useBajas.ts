import { useState, useEffect } from 'react';
import { supabase, BajaComedor, Hijo, Grado, InscripcionComedor, Padre } from '../lib/supabase';
import { InscripcionPadre } from './useInscripcionesPadres';
import { User } from '@supabase/supabase-js';
import { parseBajaDate, getMinCancellationDate, formatDateForComparison } from '../utils/dateUtils';

export function useBajas(user: User, padre?: Padre | null, inscripcionesPadre?: InscripcionPadre[]) {
  const [bajas, setBajas] = useState<BajaComedor[]>([]);
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

  const canCancelBaja = (baja: BajaComedor): { canCancel: boolean; reason?: string; deadlineDate?: string } => {
    if (!baja.dias || baja.dias.length === 0) {
      return { canCancel: false, reason: 'Baja sin fecha válida' };
    }

    const fechaBajaStr = baja.dias[0];
    const fechaBaja = parseBajaDate(fechaBajaStr);
    const minDate = getMinCancellationDate(diasAntelacion);

    const fechaBajaFormatted = formatDateForComparison(fechaBaja);
    const minDateFormatted = formatDateForComparison(minDate);

    if (fechaBajaFormatted < minDateFormatted) {
      const deadlineDate = new Date(fechaBaja);
      deadlineDate.setDate(deadlineDate.getDate() - diasAntelacion - 1);
      return {
        canCancel: false,
        reason: `Esta baja requiere ${diasAntelacion} día${diasAntelacion !== 1 ? 's' : ''} de antelación`,
        deadlineDate: deadlineDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      };
    }

    return { canCancel: true };
  };

  // Cargar hijos del padre
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

  // Cargar inscripciones de comedor
  const loadInscripciones = async () => {
    try {
      const { data, error } = await supabase
        .from('comedor_inscripciones')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setInscripciones(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Cargar bajas del usuario
  const loadBajas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comedor_bajas')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setBajas(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva baja
  const createBaja = async (personaId: string, fechas: string[]) => {
    try {
      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === personaId;

      if (isPadre) {
        // Crear bajas para el padre personal
        if (!padre) {
          throw new Error('Padre no encontrado');
        }

        const bajasToInsert = fechas.map(fecha => {
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
            dias: [fechaFormateada],
            user_id: user.id,
          };
        });

        const { data, error } = await supabase
          .from('comedor_bajas')
          .insert(bajasToInsert)
          .select('*');

        if (error) throw error;

        setBajas(prev => [...(data || []), ...prev]);
        return data;
      } else {
        // Crear bajas para un hijo
        const selectedHijo = hijos.find(h => h.id === personaId);
        if (!selectedHijo) {
          throw new Error('Hijo no encontrado');
        }

        const bajasToInsert = fechas.map(fecha => {
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
            dias: [fechaFormateada],
            user_id: user.id,
          };
        });

        const { data, error } = await supabase
          .from('comedor_bajas')
          .insert(bajasToInsert)
          .select('*');

        if (error) throw error;

        setBajas(prev => [...(data || []), ...prev]);
        return data;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteBaja = async (id: string) => {
    try {
      const baja = bajas.find(b => b.id === id);
      if (!baja) {
        throw new Error('Baja no encontrada');
      }

      const validation = canCancelBaja(baja);
      if (!validation.canCancel) {
        const errorMsg = validation.deadlineDate
          ? `${validation.reason}. Fecha límite para cancelar: ${validation.deadlineDate}`
          : validation.reason;
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('comedor_bajas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBajas(prev => prev.filter(baja => baja.id !== id));
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
          loadInscripciones(),
          loadBajas()
        ]);
      } catch (error) {
        console.error('Error initializing useBajas:', error);
        setLoading(false);
      }
    };
    init();
  }, [user.id]);

  return {
    bajas,
    hijos,
    inscripciones,
    loading,
    error,
    diasAntelacion,
    createBaja,
    deleteBaja,
    canCancelBaja,
    refetch: loadBajas,
  };
}