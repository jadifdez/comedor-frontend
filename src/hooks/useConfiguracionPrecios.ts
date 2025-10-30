import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ConfiguracionPrecio {
  id: string;
  nombre: string;
  dias_min: number;
  dias_max: number;
  precio: number;
  descuento_tercer_hijo: number;
  descuento_asistencia_80: number;
  activo: boolean;
}

export function useConfiguracionPrecios() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfiguraciones();
  }, []);

  const loadConfiguraciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('configuracion_precios')
        .select('*')
        .eq('activo', true)
        .order('dias_min', { ascending: true });

      if (fetchError) throw fetchError;

      const configuracionesConPreciosNumericos = (data || []).map(config => ({
        ...config,
        precio: typeof config.precio === 'string' ? parseFloat(config.precio) : config.precio
      }));

      setConfiguraciones(configuracionesConPreciosNumericos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrecioPorDias = (diasCount: number): number => {
    // Si no hay días seleccionados, retornar 0 sin error
    if (diasCount === 0) {
      return 0;
    }

    const config = configuraciones.find(
      c => diasCount >= c.dias_min && diasCount <= c.dias_max
    );

    if (!config) {
      throw new Error(`No se encontró configuración de precio para ${diasCount} días. Por favor, configure los precios en el panel de administración.`);
    }

    return config.precio;
  };

  return {
    configuraciones,
    loading,
    error,
    getPrecioPorDias,
    refetch: loadConfiguraciones
  };
}