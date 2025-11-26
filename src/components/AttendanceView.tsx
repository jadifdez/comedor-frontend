import React from 'react';
import { User } from '@supabase/supabase-js';
import { useAttendance } from '../hooks/useAttendance';
import { MonthSelector } from './MonthSelector';
import { AttendanceCalendar } from './AttendanceCalendar';
import { AttendanceSummary } from './AttendanceSummary';
import { AttendanceLegend } from './AttendanceLegend';
import { Padre } from '../lib/supabase';
import { AlertCircle } from 'lucide-react';

interface AttendanceViewProps {
  user: User;
  padre?: Padre | null;
}

export function AttendanceView({ user, padre }: AttendanceViewProps) {
  const { personas, loading, error, mesActual, cambiarMes } = useAttendance(user, padre);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        <p className="ml-4 text-gray-600">Cargando datos de asistencia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-900">Error al cargar los datos</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay inscripciones activas
          </h3>
          <p className="text-gray-600">
            Para ver el control de asistencia, primero necesitas inscribir a tus hijos o inscribirte tú en el servicio de comedor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Control de Asistencia</h1>
        <p className="text-gray-600">
          Visualiza los días contratados, cancelados, festivos y comidas puntuales para cada mes
        </p>
      </div>

      <MonthSelector mesActual={mesActual} onCambiarMes={cambiarMes} />

      <AttendanceLegend />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {personas.map(persona => (
          <div key={persona.id} className="space-y-0">
            <AttendanceCalendar persona={persona} mesActual={mesActual} />
            <AttendanceSummary persona={persona} />
          </div>
        ))}
      </div>

      {personas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No se encontraron inscripciones activas para el mes seleccionado</p>
        </div>
      )}
    </div>
  );
}
