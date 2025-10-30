import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Invitacion {
  id: string;
  fecha: string;
  hijo_id: string | null;
  padre_id: string | null;
  nombre_completo: string | null;
  motivo: string;
  created_at: string;
  created_by: string;
  hijo?: {
    id: string;
    nombre: string;
    grado: {
      nombre: string;
    };
  };
  padre?: {
    id: string;
    nombre: string;
    es_personal: boolean;
  };
}

export interface InvitacionFormData {
  fechas: string[];
  tipo_invitado: 'hijo' | 'padre' | 'externo';
  hijo_id?: string;
  padre_id?: string;
  nombre_completo?: string;
  motivo: string;
  es_recurrente?: boolean;
  dias_semana?: number[];
  fecha_inicio?: string;
  fecha_fin?: string;
}

export const useInvitaciones = () => {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invitaciones_comedor')
        .select(`
          *,
          hijo:hijos(id, nombre, grado:grados(nombre)),
          padre:padres(id, nombre, es_personal)
        `)
        .order('fecha', { ascending: false });

      if (fetchError) throw fetchError;
      setInvitaciones(data || []);
    } catch (err) {
      console.error('Error fetching invitaciones:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitaciones();
  }, []);

  const createInvitacion = async (formData: InvitacionFormData) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let fechasParaInsertar: string[] = [];

      if (formData.es_recurrente && formData.dias_semana && formData.dias_semana.length > 0 && formData.fecha_inicio && formData.fecha_fin) {
        fechasParaInsertar = generarFechasRecurrentes(
          formData.dias_semana,
          formData.fecha_inicio,
          formData.fecha_fin
        );
      } else {
        fechasParaInsertar = formData.fechas;
      }

      const invitacionesParaInsertar = fechasParaInsertar.map(fecha => ({
        fecha,
        hijo_id: formData.tipo_invitado === 'hijo' ? formData.hijo_id : null,
        padre_id: formData.tipo_invitado === 'padre' ? formData.padre_id : null,
        nombre_completo: formData.tipo_invitado === 'externo' ? formData.nombre_completo : null,
        motivo: formData.motivo,
        created_by: user.id
      }));

      const { error: insertError } = await supabase
        .from('invitaciones_comedor')
        .insert(invitacionesParaInsertar);

      if (insertError) throw insertError;

      await fetchInvitaciones();
      return { success: true };
    } catch (err) {
      console.error('Error creating invitacion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear invitación';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteInvitacion = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('invitaciones_comedor')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchInvitaciones();
      return { success: true };
    } catch (err) {
      console.error('Error deleting invitacion:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar invitación';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    invitaciones,
    loading,
    error,
    createInvitacion,
    deleteInvitacion,
    refreshInvitaciones: fetchInvitaciones
  };
};

function generarFechasRecurrentes(diasSemana: number[], fechaInicio: string, fechaFin: string): string[] {
  const fechas: string[] = [];

  // Parse dates properly to avoid timezone issues
  const [startYear, startMonth, startDay] = fechaInicio.split('-').map(Number);
  const [endYear, endMonth, endDay] = fechaFin.split('-').map(Number);

  const inicio = new Date(startYear, startMonth - 1, startDay);
  const fin = new Date(endYear, endMonth - 1, endDay);

  // Sort days of week to process in order
  const diasOrdenados = [...diasSemana].sort((a, b) => a - b);

  diasOrdenados.forEach(diaSemana => {
    // Start from the beginning date
    const current = new Date(inicio);

    // Find the first occurrence of this day of week
    while (current.getDay() !== diaSemana) {
      current.setDate(current.getDate() + 1);
    }

    // Generate all occurrences of this day until end date
    while (current <= fin) {
      // Format date as YYYY-MM-DD
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;

      if (!fechas.includes(fechaStr)) {
        fechas.push(fechaStr);
      }

      // Move to next week
      current.setDate(current.getDate() + 7);
    }
  });

  return fechas.sort();
}

export const useInvitacionesUsuario = () => {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitacionesUsuario();
  }, []);

  const fetchInvitacionesUsuario = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: padreData, error: padreError } = await supabase
        .from('padres')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (padreError) throw padreError;

      if (!padreData) {
        setInvitaciones([]);
        return;
      }

      const { data: hijosData, error: hijosError } = await supabase
        .from('hijos')
        .select('id')
        .eq('padre_id', padreData.id);

      if (hijosError) throw hijosError;

      const hijosIds = hijosData?.map(h => h.id) || [];

      let invitacionesData: Invitacion[] = [];

      if (hijosIds.length > 0) {
        const { data: invitacionesHijos, error: invitacionesHijosError } = await supabase
          .from('invitaciones_comedor')
          .select(`
            *,
            hijo:hijos(id, nombre, grado:grados(nombre)),
            padre:padres(id, nombre, es_personal)
          `)
          .in('hijo_id', hijosIds);

        if (invitacionesHijosError) throw invitacionesHijosError;
        invitacionesData = invitacionesHijos || [];
      }

      const { data: invitacionesPadre, error: invitacionesPadreError } = await supabase
        .from('invitaciones_comedor')
        .select(`
          *,
          hijo:hijos(id, nombre, grado:grados(nombre)),
          padre:padres(id, nombre, es_personal)
        `)
        .eq('padre_id', padreData.id);

      if (invitacionesPadreError) throw invitacionesPadreError;

      const todasInvitaciones = [...invitacionesData, ...(invitacionesPadre || [])];

      const invitacionesUnicas = todasInvitaciones.filter((inv, index, self) =>
        index === self.findIndex((t) => t.id === inv.id)
      );

      invitacionesUnicas.sort((a, b) =>
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );

      setInvitaciones(invitacionesUnicas);
    } catch (err) {
      console.error('Error fetching invitaciones usuario:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  return {
    invitaciones,
    loading,
    error,
    refreshInvitaciones: fetchInvitacionesUsuario
  };
};
