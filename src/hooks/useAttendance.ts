import { useState, useEffect, useMemo } from 'react';
import { supabase, Hijo, InscripcionComedor, BajaComedor, SolicitudComida, DiaFestivo, Padre } from '../lib/supabase';
import { InscripcionPadre } from './useInscripcionesPadres';
import { User } from '@supabase/supabase-js';

export interface PersonaConAsistencia {
  id: string;
  nombre: string;
  grado?: string;
  esPadre: boolean;
  inscripcionActiva?: InscripcionComedor | InscripcionPadre;
  diasPorCategoria: {
    contratados: Set<string>;
    cancelados: Set<string>;
    festivos: Set<string>;
    puntuales: Set<string>;
  };
  resumen: {
    totalContratados: number;
    totalCancelados: number;
    totalFestivos: number;
    totalPuntuales: number;
  };
}

export interface AttendanceData {
  personas: PersonaConAsistencia[];
  loading: boolean;
  error: string | null;
  mesActual: Date;
  cambiarMes: (nuevaMes: Date) => void;
  refetch: () => Promise<void>;
}

export function useAttendance(user: User, padre?: Padre | null): AttendanceData {
  const [mesActual, setMesActual] = useState(new Date());
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [inscripcionesHijos, setInscripcionesHijos] = useState<InscripcionComedor[]>([]);
  const [inscripcionPadre, setInscripcionPadre] = useState<InscripcionPadre | null>(null);
  const [bajas, setBajas] = useState<BajaComedor[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudComida[]>([]);
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error loading hijos:', err);
      setError(err.message);
    }
  };

  const loadInscripcionesHijos = async (hijosIds: string[]) => {
    try {
      if (hijosIds.length === 0) {
        setInscripcionesHijos([]);
        return;
      }

      const { data, error } = await supabase
        .from('comedor_inscripciones')
        .select('*')
        .in('hijo_id', hijosIds)
        .eq('activo', true);

      if (error) throw error;
      setInscripcionesHijos(data || []);
    } catch (err: any) {
      console.error('Error loading inscripciones hijos:', err);
      setError(err.message);
    }
  };

  const loadInscripcionPadre = async (padreId: string) => {
    try {
      const { data, error } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padreId)
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;
      setInscripcionPadre(data);
    } catch (err: any) {
      console.error('Error loading inscripcion padre:', err);
      setError(err.message);
    }
  };

  const loadBajas = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('comedor_bajas')
        .select('*');

      if (error) throw error;

      const bajasFiltered = (data || []).filter(baja => {
        return baja.dias.some((diaStr: string) => {
          const fechaBaja = parseBajaFecha(diaStr);
          const fechaBajaKey = formatDateToKey(fechaBaja);
          return fechaBajaKey >= startDate && fechaBajaKey <= endDate;
        });
      });

      setBajas(bajasFiltered);
    } catch (err: any) {
      console.error('Error loading bajas:', err);
      setError(err.message);
    }
  };

  const loadSolicitudes = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('comedor_altaspuntuales')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (err: any) {
      console.error('Error loading solicitudes:', err);
      setError(err.message);
    }
  };

  const loadDiasFestivos = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('dias_festivos')
        .select('*')
        .eq('activo', true)
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      if (error) throw error;
      setDiasFestivos(data || []);
    } catch (err: any) {
      console.error('Error loading dias festivos:', err);
      setError(err.message);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
      const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

      const startDate = primerDiaMes.toISOString().split('T')[0];
      const endDate = ultimoDiaMes.toISOString().split('T')[0];

      await loadHijos();

      const hijosData = await supabase
        .from('hijos')
        .select('id')
        .eq('activo', true);

      const hijosIds = hijosData.data?.map(h => h.id) || [];

      await Promise.all([
        loadInscripcionesHijos(hijosIds),
        padre?.id && padre.es_personal ? loadInscripcionPadre(padre.id) : Promise.resolve(),
        loadBajas(startDate, endDate),
        loadSolicitudes(startDate, endDate),
        loadDiasFestivos(startDate, endDate)
      ]);
    } catch (err: any) {
      console.error('Error fetching attendance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [mesActual, user.id, padre?.id]);

  const parseBajaFecha = (fechaStr: string): Date => {
    const parts = fechaStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(fechaStr);
  };

  const formatDateToKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getDiasContratados = (inscripcion: InscripcionComedor | InscripcionPadre, mes: Date): Set<string> => {
    const dias = new Set<string>();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);

    const fechaInicio = new Date(inscripcion.fecha_inicio);
    const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;

    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      if (d < fechaInicio) continue;
      if (fechaFin && d > fechaFin) continue;

      const diaSemana = d.getDay();
      const diaSemanaNormalizado = diaSemana === 0 ? 7 : diaSemana;

      if (inscripcion.dias_semana.includes(diaSemanaNormalizado)) {
        dias.add(formatDateToKey(new Date(d)));
      }
    }

    return dias;
  };

  const personas = useMemo((): PersonaConAsistencia[] => {
    const resultado: PersonaConAsistencia[] = [];

    const festivos = new Set(diasFestivos.map(f => f.fecha));

    hijos.forEach(hijo => {
      const inscripcion = inscripcionesHijos.find(i => i.hijo_id === hijo.id);

      const contratados = inscripcion ? getDiasContratados(inscripcion, mesActual) : new Set<string>();

      const cancelados = new Set(
        bajas
          .filter(b => b.hijo_id && b.hijo_id === hijo.id)
          .flatMap(b => b.dias)
          .map(d => formatDateToKey(parseBajaFecha(d)))
      );

      const puntuales = new Set(
        solicitudes
          .filter(s => s.hijo_id && s.hijo_id === hijo.id)
          .map(s => s.fecha)
      );

      const persona: PersonaConAsistencia = {
        id: hijo.id,
        nombre: hijo.nombre,
        grado: hijo.grado?.nombre,
        esPadre: false,
        inscripcionActiva: inscripcion,
        diasPorCategoria: {
          contratados,
          cancelados,
          festivos,
          puntuales
        },
        resumen: {
          totalContratados: contratados.size,
          totalCancelados: cancelados.size,
          totalFestivos: festivos.size,
          totalPuntuales: puntuales.size
        }
      };

      resultado.push(persona);
    });

    if (padre?.es_personal && inscripcionPadre) {
      const contratados = getDiasContratados(inscripcionPadre, mesActual);

      const cancelados = new Set(
        bajas
          .filter(b => b.padre_id && b.padre_id === padre.id)
          .flatMap(b => b.dias)
          .map(d => formatDateToKey(parseBajaFecha(d)))
      );

      const puntuales = new Set(
        solicitudes
          .filter(s => s.padre_id && s.padre_id === padre.id)
          .map(s => s.fecha)
      );

      const personaPadre: PersonaConAsistencia = {
        id: padre.id,
        nombre: padre.nombre,
        grado: 'Personal del colegio',
        esPadre: true,
        inscripcionActiva: inscripcionPadre,
        diasPorCategoria: {
          contratados,
          cancelados,
          festivos,
          puntuales
        },
        resumen: {
          totalContratados: contratados.size,
          totalCancelados: cancelados.size,
          totalFestivos: festivos.size,
          totalPuntuales: puntuales.size
        }
      };

      resultado.unshift(personaPadre);
    }

    return resultado;
  }, [hijos, inscripcionesHijos, inscripcionPadre, bajas, solicitudes, diasFestivos, mesActual, padre]);

  const cambiarMes = (nuevaMes: Date) => {
    setMesActual(nuevaMes);
  };

  return {
    personas,
    loading,
    error,
    mesActual,
    cambiarMes,
    refetch: fetchAllData
  };
}
