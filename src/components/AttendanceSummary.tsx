import React from 'react';
import { PersonaConAsistencia } from '../hooks/useAttendance';
import { CheckCircle2, XCircle, Heart, PlusCircle } from 'lucide-react';

interface AttendanceSummaryProps {
  persona: PersonaConAsistencia;
}

export function AttendanceSummary({ persona }: AttendanceSummaryProps) {
  const estadisticas = [
    {
      label: 'Días contratados',
      valor: persona.resumen.totalContratados,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2
    },
    {
      label: 'Días cancelados',
      valor: persona.resumen.totalCancelados,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: XCircle
    },
    {
      label: 'Días festivos',
      valor: persona.resumen.totalFestivos,
      color: 'text-pink-700',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      icon: Heart
    },
    {
      label: 'Comidas puntuales',
      valor: persona.resumen.totalPuntuales,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: PlusCircle
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen del mes</h4>

      <div className="grid grid-cols-2 gap-3">
        {estadisticas.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-3 transition-all hover:shadow-sm`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs font-medium text-gray-600">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.valor}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
