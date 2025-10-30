import { useState, useEffect } from 'react';
import { supabase, InscripcionComedor, Hijo } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useInscripcionesComedor(user: User) {
  const [inscripciones, setInscripciones] = useState<InscripcionComedor[]>([]);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Cargar inscripciones del usuario
  const loadInscripciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comedor_inscripciones')
        .select(`
          *,
          hijo_details:hijos(*, grado:grados(*))
        `)
        .order('activo', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInscripciones(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear o actualizar inscripción
  const saveInscripcion = async (hijoId: string, diasSemana: number[], fechaInicio: string) => {
    try {
      // Verificar si ya existe una inscripción activa para este hijo
      const { data: existingInscripcion, error: checkError } = await supabase
        .from('comedor_inscripciones')
        .select('id')
        .eq('hijo_id', hijoId)
        .eq('activo', true)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      const inscripcionData = {
        hijo_id: hijoId,
        dias_semana: diasSemana,
        activo: true,
        fecha_inicio: fechaInicio, // YYYY-MM-DD
      };

      let result;
      if (existingInscripcion) {
        // Actualizar inscripción existente
        const { data, error } = await supabase
          .from('comedor_inscripciones')
          .update(inscripcionData)
          .eq('id', existingInscripcion.id)
          .select(`
            *,
            hijo_details:hijos(*, grado:grados(*))
          `);

        if (error) throw error;
        result = data;
      } else {
        // Crear nueva inscripción
        const { data, error } = await supabase
          .from('comedor_inscripciones')
          .insert([inscripcionData])
          .select(`
            *,
            hijo_details:hijos(*, grado:grados(*))
          `);

        if (error) throw error;
        result = data;
      }

      // Actualizar la lista local
      await loadInscripciones();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Desactivar inscripción
  const desactivarInscripcion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comedor_inscripciones')
        .update({ 
          activo: false,
          fecha_fin: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar la lista local
      await loadInscripciones();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Calcular precio mensual para un hijo
  const calcularPrecioMensual = (inscripcion: InscripcionComedor) => {
    const diasPorSemana = inscripcion.dias_semana.length;
    const precioSemanal = diasPorSemana * inscripcion.precio_diario;
    // Aproximadamente 4.33 semanas por mes
    const precioMensual = precioSemanal * 4.33;
    return Math.round(precioMensual * 100) / 100; // Redondear a 2 decimales
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadHijos(), loadInscripciones()]);
      } catch (error) {
        console.error('Error initializing useInscripcionesComedor:', error);
        setLoading(false);
      }
    };
    init();
  }, [user.id]);

  return {
    inscripciones,
    hijos,
    loading,
    error,
    saveInscripcion,
    desactivarInscripcion,
    calcularPrecioMensual,
    refetch: loadInscripciones,
  };
}