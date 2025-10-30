import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthSelectorProps {
  mesActual: Date;
  onCambiarMes: (nuevaMes: Date) => void;
}

export function MonthSelector({ mesActual, onCambiarMes }: MonthSelectorProps) {
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const mesAnterior = () => {
    const nuevaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1);
    onCambiarMes(nuevaMes);
  };

  const mesSiguiente = () => {
    const nuevaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1);
    onCambiarMes(nuevaMes);
  };

  const volverHoy = () => {
    const hoy = new Date();
    const nuevaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    onCambiarMes(nuevaMes);
  };

  const esMesActual = () => {
    const hoy = new Date();
    return mesActual.getMonth() === hoy.getMonth() && mesActual.getFullYear() === hoy.getFullYear();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={mesAnterior}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center space-x-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              {mesesNombres[mesActual.getMonth()]} {mesActual.getFullYear()}
            </h2>
          </div>

          {!esMesActual() && (
            <button
              onClick={volverHoy}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Mes actual</span>
            </button>
          )}
        </div>

        <button
          onClick={mesSiguiente}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
