import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface InscripcionPadre {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}

export interface Padre {
  id: string;
  email: string;
  nombre: string;
  telefono: string;
  es_personal: boolean;
  activo: boolean;
  created_at: string;
}

export function useInscripcionesPadres(user: User) {
  const [inscripciones, setInscripciones] = useState<InscripcionPadre[]>([]);
  const [padre, setPadre] = useState<Padre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del padre autenticado
  const loadPadre = async () => {
    try {
      // RLS automatically filters by email = auth.email()
      const { data, error: fetchError } = await supabase
        .from('padres')
        .select('*')
        .eq('activo', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      console.log('Loaded padre:', data);
      setPadre(data);
      return data;
    } catch (err: any) {
      console.error('Error loading padre:', err);
      setError(err.message);
      return null;
    }
  };

  // Cargar inscripciones del padre
  const loadInscripciones = async (padreData: Padre | null) => {
    try {
      if (!padreData) {
        setInscripciones([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padreData.id)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInscripciones(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const padreData = await loadPadre();
        await loadInscripciones(padreData);
      } catch (error) {
        console.error('Error initializing useInscripcionesPadres:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Guardar nueva inscripción
  const saveInscripcion = async (diasSemana: number[], fechaInicio: string) => {
    try {
      if (!padre) {
        throw new Error('No se encontró información del padre');
      }

      if (!padre.es_personal) {
        throw new Error('Solo el personal del colegio puede inscribirse al comedor');
      }

      const { error: insertError } = await supabase
        .from('comedor_inscripciones_padres')
        .insert({
          padre_id: padre.id,
          dias_semana: diasSemana,
          fecha_inicio: fechaInicio,
          activo: true
        });

      if (insertError) throw insertError;

      await loadInscripciones(padre);
    } catch (err: any) {
      console.error('Error al guardar la inscripción:', err);
      throw err;
    }
  };

  // Desactivar inscripción
  const desactivarInscripcion = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('comedor_inscripciones_padres')
        .update({
          activo: false,
          fecha_fin: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await loadInscripciones(padre);
    } catch (err: any) {
      console.error('Error al desactivar la inscripción:', err);
      throw err;
    }
  };

  // Calcular precio mensual
  const calcularPrecioMensual = (inscripcion: InscripcionPadre) => {
    const precioSemanal = inscripcion.dias_semana.length * inscripcion.precio_diario;
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  return {
    inscripciones,
    padre,
    loading,
    error,
    saveInscripcion,
    desactivarInscripcion,
    calcularPrecioMensual
  };
}