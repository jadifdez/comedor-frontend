import React from 'react';
import { Clock, Calendar, User, Trash2, CheckCircle, XCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { SolicitudComida } from '../lib/supabase';
import { ConfirmModal } from './ConfirmModal';

interface SolicitudesListProps {
  solicitudes: SolicitudComida[];
  diasAntelacion: number;
  onDelete?: (id: string) => void;
  canCancelSolicitud: (solicitud: SolicitudComida) => { canCancel: boolean; reason?: string; deadlineDate?: string };
}

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'aprobada':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rechazada':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-600" />;
  }
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'aprobada':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'rechazada':
      return 'bg-red-50 border-red-200 text-red-800';
    default:
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  }
};

const getEstadoTexto = (estado: string) => {
  switch (estado) {
    case 'aprobada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    default:
      return 'Pendiente';
  }
};

export function SolicitudesList({ solicitudes, diasAntelacion, onDelete, canCancelSolicitud }: SolicitudesListProps) {
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [solicitudToDelete, setSolicitudToDelete] = React.useState<SolicitudComida | null>(null);

  const handleDeleteClick = (solicitud: SolicitudComida) => {
    setSolicitudToDelete(solicitud);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (solicitudToDelete && onDelete) {
      await onDelete(solicitudToDelete.id);
      setShowConfirmModal(false);
      setSolicitudToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setSolicitudToDelete(null);
  };

  if (solicitudes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes registradas</h3>
        <p className="text-gray-600">Las solicitudes de comida puntual que envíes aparecerán aquí</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <span>Solicitudes de comida puntual</span>
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Política de cancelación</p>
              <p>
                Puedes cancelar solicitudes con al menos <span className="font-bold">{diasAntelacion} día{diasAntelacion !== 1 ? 's' : ''} de antelación</span>.
                Las solicitudes que no cumplan este plazo no podrán ser canceladas.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
        {solicitudes.map((solicitud) => {
          const validation = canCancelSolicitud(solicitud);
          const canCancel = validation.canCancel;

          return (
            <div
              key={solicitud.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {solicitud.hijo} ({solicitud.curso})
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Fecha solicitada: {solicitud.fecha}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Solicitado el {new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')} a las {new Date(solicitud.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {onDelete && (
                  <div className="ml-4">
                    {canCancel ? (
                      <button
                        onClick={() => handleDeleteClick(solicitud)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        title="Cancelar solicitud"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex items-center space-x-1 px-3 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm"
                        title={validation.reason}
                      >
                        <X className="h-4 w-4" />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Cancelar solicitud"
        message={`¿Estás seguro de que quieres cancelar la solicitud de comida puntual de ${solicitudToDelete?.hijo} para el día ${solicitudToDelete?.fecha}?`}
        confirmText="Sí, cancelar solicitud"
        cancelText="No, mantener solicitud"
      />
    </>
  );
}