import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface InscripcionPadreAdmin {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}

export interface PadreConInscripcion {
  id: string;
  nombre: string;
  email: string;
  es_personal: boolean;
  inscripcion_activa: InscripcionPadreAdmin | null;
}

export function useInscripcionesPadresAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificarInscripcionActiva = async (padreId: string): Promise<InscripcionPadreAdmin | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padreId)
        .eq('activo', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      console.error('Error verificando inscripción activa:', err);
      return null;
    }
  };

  const cargarInscripciones = async (padreId: string): Promise<InscripcionPadreAdmin[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padreId)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err: any) {
      console.error('Error cargando inscripciones:', err);
      setError(err.message);
      return [];
    }
  };

  const crearInscripcion = async (
    padreId: string,
    diasSemana: number[],
    fechaInicio: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const inscripcionExistente = await verificarInscripcionActiva(padreId);
      if (inscripcionExistente) {
        return {
          success: false,
          error: 'Este profesor ya tiene una inscripción activa al comedor'
        };
      }

      const { error: insertError } = await supabase
        .from('comedor_inscripciones_padres')
        .insert({
          padre_id: padreId,
          dias_semana: diasSemana,
          fecha_inicio: fechaInicio,
          activo: true
        });

      if (insertError) throw insertError;

      return { success: true };
    } catch (err: any) {
      console.error('Error creando inscripción:', err);
      const errorMessage = err.message || 'Error al crear la inscripción';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const desactivarInscripcion = async (inscripcionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('comedor_inscripciones_padres')
        .update({
          activo: false,
          fecha_fin: new Date().toISOString().split('T')[0]
        })
        .eq('id', inscripcionId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (err: any) {
      console.error('Error desactivando inscripción:', err);
      const errorMessage = err.message || 'Error al desactivar la inscripción';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const calcularPrecioMensual = (inscripcion: InscripcionPadreAdmin): number => {
    const precioSemanal = inscripcion.dias_semana.length * inscripcion.precio_diario;
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  return {
    loading,
    error,
    verificarInscripcionActiva,
    cargarInscripciones,
    crearInscripcion,
    desactivarInscripcion,
    calcularPrecioMensual
  };
}
