import React from 'react';

export function AttendanceLegend() {
  const leyenda = [
    {
      color: 'bg-green-100 border-green-300',
      label: 'Días contratados',
      descripcion: 'Días en los que el hijo/a tiene comedor contratado según su inscripción'
    },
    {
      color: 'bg-red-100 border-red-300',
      label: 'Días cancelados',
      descripcion: 'Días en los que se ha comunicado una baja del servicio de comedor'
    },
    {
      color: 'bg-pink-100 border-pink-300',
      label: 'Días festivos',
      descripcion: 'Días festivos locales en los que no hay servicio de comedor'
    },
    {
      color: 'bg-blue-100 border-blue-300',
      label: 'Comidas puntuales',
      descripcion: 'Días con solicitud de comida puntual aprobada'
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Leyenda</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {leyenda.map((item, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`${item.color} border-2 rounded-lg w-8 h-8 flex-shrink-0`} />
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-600 mt-1">{item.descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
