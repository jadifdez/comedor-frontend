import React, { useMemo, useState, useEffect } from 'react';
import { DiaFacturable } from '../hooks/useFacturacion';
import { supabase } from '../lib/supabase';

interface FacturacionCalendarioProps {
  mesSeleccionado: string;
  diasFacturables: DiaFacturable[];
  desglose: {
    diasInscripcion: number;
    diasPuntuales: number;
    diasBaja: number;
    diasFestivos: number;
    diasInvitacion: number;
  };
  hijoId: string;
}

interface Semana {
  dias: (Date | null)[];
}

export function FacturacionCalendario({ mesSeleccionado, diasFacturables, desglose, hijoId }: FacturacionCalendarioProps) {
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  const [bajas, setBajas] = useState<Set<string>>(new Set());
  const [festivos, setFestivos] = useState<Set<string>>(new Set());
  const [invitaciones, setInvitaciones] = useState<Set<string>>(new Set());

  const [year, month] = mesSeleccionado.split('-').map(Number);
  const mesActual = new Date(year, month - 1, 1);

  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

  useEffect(() => {
    const loadDatosCalendario = async () => {
      const fechaInicio = `${year}-${String(month).padStart(2, '0')}-01`;
      const ultimoDia = new Date(year, month, 0).getDate();
      const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      const [bajasData, festivosData, invitacionesData] = await Promise.all([
        supabase
          .from('comedor_bajas')
          .select('dias')
          .eq('hijo_id', hijoId)
          .gte('fecha_creacion', fechaInicio)
          .lte('fecha_creacion', fechaFin),

        supabase
          .from('dias_festivos')
          .select('fecha')
          .eq('activo', true)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin),

        supabase
          .from('invitaciones_comedor')
          .select('fecha')
          .eq('hijo_id', hijoId)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
      ]);

      const parseBajaFecha = (fechaStr: string): string => {
        const parts = fechaStr.split('/');
        if (parts.length === 3) {
          const dia = parseInt(parts[0]);
          const mes = parseInt(parts[1]);
          const anio = parseInt(parts[2]);
          return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        }
        return fechaStr;
      };

      const bajasSet = new Set<string>();
      bajasData.data?.forEach(baja => {
        baja.dias.forEach((dia: string) => {
          bajasSet.add(parseBajaFecha(dia));
        });
      });

      const festivosSet = new Set(festivosData.data?.map(f => f.fecha) || []);
      const invitacionesSet = new Set(invitacionesData.data?.map(i => i.fecha) || []);

      setBajas(bajasSet);
      setFestivos(festivosSet);
      setInvitaciones(invitacionesSet);
    };

    loadDatosCalendario();
  }, [mesSeleccionado, hijoId, year, month]);

  const semanas = useMemo(() => {
    const semanasArray: Semana[] = [];
    let semanaActual: (Date | null)[] = [];

    let primerDiaSemana = primerDiaMes.getDay();
    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    for (let i = 0; i < primerDiaSemana; i++) {
      semanaActual.push(null);
    }

    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
      // Crear la fecha a mediodía para evitar problemas de zona horaria
      const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia, 12, 0, 0);
      const diaSemana = fecha.getDay();

      if (diaSemana === 0 || diaSemana === 6) {
        continue;
      }

      semanaActual.push(fecha);

      if (diaSemana === 5) {
        semanasArray.push({ dias: [...semanaActual] });
        semanaActual = [];
      }
    }

    if (semanaActual.length > 0) {
      while (semanaActual.length < 5) {
        semanaActual.push(null);
      }
      semanasArray.push({ dias: semanaActual });
    }

    return semanasArray;
  }, [mesActual, primerDiaMes, ultimoDiaMes]);

  const formatDateToKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const diasFacturablesMap = useMemo(() => {
    const map = new Map<string, DiaFacturable>();
    diasFacturables.forEach(dia => {
      map.set(dia.fecha, dia);
    });
    return map;
  }, [diasFacturables]);

  const getEstadoDia = (fecha: Date): { color: string; label: string; tipo: string } => {
    const key = formatDateToKey(fecha);

    if (festivos.has(key)) {
      return {
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        label: 'Festivo',
        tipo: 'festivo'
      };
    }

    if (invitaciones.has(key)) {
      return {
        color: 'bg-purple-100 border-purple-300 text-purple-800',
        label: 'Invitación',
        tipo: 'invitacion'
      };
    }

    if (bajas.has(key)) {
      return {
        color: 'bg-red-100 border-red-300 text-red-800',
        label: 'Cancelado',
        tipo: 'cancelado'
      };
    }

    const diaFacturable = diasFacturablesMap.get(key);

    if (diaFacturable) {
      if (diaFacturable.tipo === 'inscripcion') {
        return {
          color: 'bg-green-100 border-green-300 text-green-800',
          label: `Contratado (${key})`,
          tipo: 'inscripcion'
        };
      } else {
        return {
          color: 'bg-blue-100 border-blue-300 text-blue-800',
          label: 'Puntual',
          tipo: 'puntual'
        };
      }
    }

    return {
      color: 'bg-gray-50 border-gray-200 text-gray-400',
      label: `Sin servicio (${key})`,
      tipo: 'sin-servicio'
    };
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-2">
      <div className="mb-2">
        <h5 className="text-xs font-semibold text-gray-900 mb-1.5">Calendario</h5>

        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-2 text-[9px]">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300 flex-shrink-0"></div>
            <span className="text-gray-700">Contratado ({desglose.diasInscripcion})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300 flex-shrink-0"></div>
            <span className="text-gray-700">Puntual ({desglose.diasPuntuales})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300 flex-shrink-0"></div>
            <span className="text-gray-700">Cancelado ({desglose.diasBaja})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300 flex-shrink-0"></div>
            <span className="text-gray-700">Festivo ({desglose.diasFestivos})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300 flex-shrink-0"></div>
            <span className="text-gray-700">Invitación ({desglose.diasInvitacion})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-0.5 mb-0.5">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-[8px] font-medium text-gray-600 py-0.5">
            {dia}
          </div>
        ))}
      </div>

      {semanas.map((semana, semanaIndex) => (
        <div key={semanaIndex} className="grid grid-cols-5 gap-0.5 mb-0.5">
          {semana.dias.map((fecha, diaIndex) => {
            if (!fecha) {
              return <div key={`empty-${semanaIndex}-${diaIndex}`} className="w-5 h-5" />;
            }

            const estado = getEstadoDia(fecha);
            const esHoy =
              fecha.getDate() === new Date().getDate() &&
              fecha.getMonth() === new Date().getMonth() &&
              fecha.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={`${semanaIndex}-${diaIndex}`}
                className={`
                  w-5 h-5 flex items-center justify-center rounded border text-[9px] font-medium
                  transition-all cursor-default
                  ${estado.color}
                  ${esHoy ? 'ring-1 ring-blue-500' : ''}
                `}
                title={estado.label}
              >
                {fecha.getDate()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
