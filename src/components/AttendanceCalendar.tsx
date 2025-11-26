import React from 'react';
import { PersonaConAsistencia } from '../hooks/useAttendance';

interface AttendanceCalendarProps {
  persona: PersonaConAsistencia;
  mesActual: Date;
}

export function AttendanceCalendar({ persona, mesActual }: AttendanceCalendarProps) {
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);

  let primerDiaSemana = primerDiaMes.getDay();
  primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

  const diasDelMes: (Date | null)[] = [];

  for (let i = 0; i < primerDiaSemana; i++) {
    diasDelMes.push(null);
  }

  for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
    diasDelMes.push(new Date(mesActual.getFullYear(), mesActual.getMonth(), dia));
  }

  const formatDateToKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getEstadoDia = (fecha: Date): { color: string; label: string; tooltip: string } => {
    const key = formatDateToKey(fecha);

    console.log(`[CALENDARIO] Evaluando día ${key}:`, {
      festivo: persona.diasPorCategoria.festivos.has(key),
      cancelado: persona.diasPorCategoria.cancelados.has(key),
      puntual: persona.diasPorCategoria.puntuales.has(key),
      contratado: persona.diasPorCategoria.contratados.has(key)
    });

    if (persona.diasPorCategoria.festivos.has(key)) {
      return {
        color: 'bg-pink-100 border-pink-300 text-pink-700',
        label: 'Festivo',
        tooltip: 'Día festivo'
      };
    }

    if (persona.diasPorCategoria.cancelados.has(key)) {
      console.log(`[CALENDARIO] ${key} ES CANCELADO - debería ser ROJO`);
      return {
        color: 'bg-red-100 border-red-300 text-red-700',
        label: 'Cancelado',
        tooltip: 'Día cancelado'
      };
    }

    if (persona.diasPorCategoria.puntuales.has(key)) {
      return {
        color: 'bg-blue-100 border-blue-300 text-blue-700',
        label: 'Puntual',
        tooltip: 'Comida puntual'
      };
    }

    if (persona.diasPorCategoria.contratados.has(key)) {
      return {
        color: 'bg-green-100 border-green-300 text-green-700',
        label: 'Contratado',
        tooltip: 'Día contratado'
      };
    }

    return {
      color: 'bg-gray-50 border-gray-200 text-gray-400',
      label: 'Sin servicio',
      tooltip: 'Sin servicio de comedor'
    };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{persona.nombre}</h3>
        <p className="text-sm text-gray-600">{persona.grado}</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {diasSemana.map(dia => (
            <div key={dia} className="text-center text-xs font-medium text-gray-600 py-1">
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {diasDelMes.map((fecha, index) => {
            if (!fecha) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const estado = getEstadoDia(fecha);
            const esHoy =
              fecha.getDate() === new Date().getDate() &&
              fecha.getMonth() === new Date().getMonth() &&
              fecha.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={index}
                className={`
                  aspect-square flex items-center justify-center rounded-lg border-2 text-sm font-medium
                  transition-all cursor-default
                  ${estado.color}
                  ${esHoy ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                `}
                title={estado.tooltip}
              >
                {fecha.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
