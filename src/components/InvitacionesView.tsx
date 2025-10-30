import React from 'react';
import { Calendar, Gift } from 'lucide-react';
import { useInvitacionesUsuario } from '../hooks/useInvitaciones';

export const InvitacionesView: React.FC = () => {
  const { invitaciones, loading, error } = useInvitacionesUsuario();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Cargando invitaciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  const invitacionesFuturas = invitaciones.filter(
    inv => new Date(inv.fecha) >= new Date()
  );

  const invitacionesPasadas = invitaciones.filter(
    inv => new Date(inv.fecha) < new Date()
  );

  const getInvitadoDisplay = (inv: typeof invitaciones[0]) => {
    if (inv.hijo) return `${inv.hijo.nombre} (${inv.hijo.grado.nombre})`;
    if (inv.padre) return inv.padre.nombre;
    if (inv.nombre_completo) return inv.nombre_completo;
    return 'Desconocido';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Mis Invitaciones</h2>
      </div>

      {invitaciones.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Gift className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">No tienes invitaciones registradas</p>
          <p className="text-gray-500 text-sm mt-2">
            Las invitaciones del centro aparecerán aquí
          </p>
        </div>
      ) : (
        <>
          {invitacionesFuturas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Próximas Invitaciones
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {invitacionesFuturas.map((invitacion) => (
                    <div
                      key={invitacion.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span className="text-lg font-semibold text-gray-900">
                              {new Date(invitacion.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="ml-8 space-y-1">
                            <p className="text-gray-700">
                              <span className="font-medium">Para:</span> {getInvitadoDisplay(invitacion)}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Motivo:</span> {invitacion.motivo}
                            </p>
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Próxima
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {invitacionesPasadas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invitaciones Anteriores
              </h3>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {invitacionesPasadas.map((invitacion) => (
                    <div
                      key={invitacion.id}
                      className="p-6 hover:bg-gray-50 transition-colors opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-lg font-medium text-gray-700">
                              {new Date(invitacion.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="ml-8 space-y-1">
                            <p className="text-gray-600">
                              <span className="font-medium">Para:</span> {getInvitadoDisplay(invitacion)}
                            </p>
                            <p className="text-gray-500">
                              <span className="font-medium">Motivo:</span> {invitacion.motivo}
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                          Pasada
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Nota:</span> Los días que hayas sido invitado no se cobrarán
          en tu factura mensual. Estos días no aparecerán como facturables, incluso si tienes una
          inscripción regular o solicitud puntual para ese día.
        </p>
      </div>
    </div>
  );
};
