import React, { useState } from 'react';
import { ChefHat, Calendar, User, Utensils, AlertTriangle, X, AlertCircle, Info } from 'lucide-react';
import { EleccionMenu } from '../lib/supabase';
import { formatDateForDisplay } from '../utils/dateUtils';
import { ConfirmModal } from './ConfirmModal';

interface MenuEleccionesListProps {
  elecciones: EleccionMenu[];
  diasAntelacion: number;
  onDelete?: (id: string) => void;
  canCancelEleccionMenu: (eleccion: EleccionMenu) => { canCancel: boolean; reason?: string; deadlineDate?: string };
}

export function MenuEleccionesList({ elecciones, diasAntelacion, onDelete, canCancelEleccionMenu }: MenuEleccionesListProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [eleccionToDelete, setEleccionToDelete] = useState<EleccionMenu | null>(null);

  const handleDeleteClick = (eleccion: EleccionMenu) => {
    setEleccionToDelete(eleccion);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (eleccionToDelete && onDelete) {
      await onDelete(eleccionToDelete.id);
      setShowConfirmModal(false);
      setEleccionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setEleccionToDelete(null);
  };

  if (elecciones.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay elecciones de menú</h3>
        <p className="text-gray-600">Las elecciones de menú que hagas aparecerán aquí</p>
      </div>
    );
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00');
    return formatDateForDisplay(date);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <ChefHat className="h-5 w-5 text-orange-600" />
            <span>Elecciones de menú</span>
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Política de cancelación</p>
              <p>
                Puedes cancelar elecciones de menú con al menos <span className="font-bold">{diasAntelacion} día{diasAntelacion !== 1 ? 's' : ''} de antelación</span>.
                Las elecciones que no cumplan este plazo no podrán ser canceladas.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
        {elecciones.map((eleccion) => {
          const validation = canCancelEleccionMenu(eleccion);
          const canCancel = validation.canCancel;

          return (
            <div
              key={eleccion.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {eleccion.hijo_details?.nombre
                        ? `${eleccion.hijo_details.nombre} (${eleccion.hijo_details.grado?.nombre})`
                        : eleccion.padre_details?.nombre
                        ? `${eleccion.padre_details.nombre} (Personal del colegio)`
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatFecha(eleccion.fecha)}
                    </span>
                  </div>

                  <div className="flex items-start space-x-2 mb-2">
                    <Utensils className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <div><strong>Principal:</strong> {eleccion.opcion_principal?.nombre}</div>
                      <div><strong>Guarnición:</strong> {eleccion.opcion_guarnicion?.nombre}</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    {eleccion.updated_at !== eleccion.created_at ? 'Modificado' : 'Creado'} el {new Date(eleccion.updated_at).toLocaleDateString('es-ES')} a las {new Date(eleccion.updated_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {onDelete && (
                  <div className="ml-4">
                    {canCancel ? (
                      <button
                        onClick={() => handleDeleteClick(eleccion)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        title="Cancelar elección"
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
        title="Cancelar elección de menú"
        message={`¿Estás seguro de que quieres cancelar la elección de menú de ${eleccionToDelete?.hijo_details?.nombre || eleccionToDelete?.padre_details?.nombre} para el día ${eleccionToDelete?.fecha}? Se servirá el menú estándar del día.`}
        confirmText="Sí, cancelar elección"
        cancelText="No, mantener elección"
      />
    </>
  );
}