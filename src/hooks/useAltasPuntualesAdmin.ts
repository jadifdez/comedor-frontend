import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AltaPuntualFormData {
  tipo_persona: 'hijo' | 'padre';
  persona_id: string;
  fechas: string[];
}

export const useAltasPuntualesAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAltasPuntuales = async (formData: AltaPuntualFormData) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let personaData: any = null;

      if (formData.tipo_persona === 'hijo') {
        const { data: hijoData, error: hijoError } = await supabase
          .from('hijos')
          .select('id, nombre, grado:grados(nombre)')
          .eq('id', formData.persona_id)
          .maybeSingle();

        if (hijoError) throw hijoError;
        if (!hijoData) throw new Error('Hijo no encontrado');
        personaData = hijoData;
      } else {
        const { data: padreData, error: padreError } = await supabase
          .from('padres')
          .select('id, nombre')
          .eq('id', formData.persona_id)
          .maybeSingle();

        if (padreError) throw padreError;
        if (!padreData) throw new Error('Padre no encontrado');
        personaData = padreData;
      }

      const nombreCompleto = personaData.nombre;

      const solicitudesToInsert = formData.fechas.map(fecha => {
        const date = new Date(fecha);
        const fechaFormateada = date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        if (formData.tipo_persona === 'hijo') {
          return {
            hijo: nombreCompleto,
            hijo_id: formData.persona_id,
            curso: personaData.grado?.nombre || '',
            fecha: fechaFormateada,
            user_id: user.id,
            estado: 'aprobada' as const,
          };
        } else {
          return {
            hijo: nombreCompleto,
            padre_id: formData.persona_id,
            curso: 'Personal del colegio',
            fecha: fechaFormateada,
            user_id: user.id,
            estado: 'aprobada' as const,
          };
        }
      });

      const { data, error: insertError } = await supabase
        .from('comedor_altaspuntuales')
        .insert(solicitudesToInsert)
        .select('*');

      if (insertError) throw insertError;

      return { success: true, data };
    } catch (err: any) {
      console.error('Error al crear altas puntuales:', err);
      const errorMessage = err?.message || 'Error desconocido al crear altas puntuales';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createAltasPuntuales
  };
};
