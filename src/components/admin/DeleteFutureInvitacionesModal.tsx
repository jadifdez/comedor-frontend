import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { SearchableSelect } from '../SearchableSelect';
import { supabase } from '../../lib/supabase';

interface DeleteFutureInvitacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tipoInvitado: 'hijo' | 'padre', id: string, nombre: string) => Promise<void>;
  onGetCount: (tipoInvitado: 'hijo' | 'padre', id: string) => Promise<{ count: number; fechaInicio: string; fechaFin: string } | null>;
}

interface Hijo {
  id: string;
  nombre: string;
  grado: {
    nombre: string;
  };
  padre: {
    nombre: string;
  };
}

interface Padre {
  id: string;
  nombre: string;
  es_personal: boolean;
}

export const DeleteFutureInvitacionesModal: React.FC<DeleteFutureInvitacionesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onGetCount
}) => {
  const [tipoInvitado, setTipoInvitado] = useState<'hijo' | 'padre'>('hijo');
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedNombre, setSelectedNombre] = useState<string>('');
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [invitacionesInfo, setInvitacionesInfo] = useState<{ count: number; fechaInicio: string; fechaFin: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHijos();
      fetchPadres();
    }
  }, [isOpen]);

  const fetchHijos = async () => {
    const { data } = await supabase
      .from('hijos')
      .select(`
        id,
        nombre,
        grado:grados(nombre),
        padre:padres(nombre)
      `)
      .eq('activo', true)
      .order('nombre');

    if (data) setHijos(data);
  };

  const fetchPadres = async () => {
    const { data } = await supabase
      .from('padres')
      .select('id, nombre, es_personal')
      .eq('activo', true)
      .eq('es_personal', true)
      .order('nombre');

    if (data) setPadres(data);
  };

  const handleNext = async () => {
    if (!selectedId) return;

    setLoading(true);
    const info = await onGetCount(tipoInvitado, selectedId);
    setInvitacionesInfo(info);
    setLoading(false);

    if (info && info.count > 0) {
      setShowConfirmation(true);
    } else {
      alert('Este miembro no tiene invitaciones futuras.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;

    setIsSubmitting(true);
    try {
      await onConfirm(tipoInvitado, selectedId, selectedNombre);
      handleClose();
    } catch (error) {
      console.error('Error deleting future invitaciones:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTipoInvitado('hijo');
    setSelectedId('');
    setSelectedNombre('');
    setShowConfirmation(false);
    setInvitacionesInfo(null);
    onClose();
  };

  const handleSelectChange = (value: string) => {
    setSelectedId(value);

    if (tipoInvitado === 'hijo') {
      const hijo = hijos.find(h => h.id === value);
      if (hijo) {
        setSelectedNombre(`${hijo.nombre} - ${hijo.grado.nombre}`);
      }
    } else {
      const padre = padres.find(p => p.id === value);
      if (padre) {
        setSelectedNombre(padre.nombre);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        <div className="relative inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!showConfirmation ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-full p-3">
                  <Trash2 className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Eliminar Invitaciones Futuras
                </h3>
              </div>

              <p className="text-sm text-gray-600">
                Seleccione el miembro para el cual desea eliminar todas las invitaciones desde mañana en adelante.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Invitado
                </label>
                <select
                  value={tipoInvitado}
                  onChange={(e) => {
                    setTipoInvitado(e.target.value as 'hijo' | 'padre');
                    setSelectedId('');
                    setSelectedNombre('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="hijo">Alumno</option>
                  <option value="padre">Personal/Profesor</option>
                </select>
              </div>

              {tipoInvitado === 'hijo' ? (
                <SearchableSelect
                  label="Seleccionar Alumno"
                  options={hijos.map(hijo => ({
                    value: hijo.id,
                    label: `${hijo.nombre} - ${hijo.grado.nombre} (Padre: ${hijo.padre.nombre})`
                  }))}
                  value={selectedId}
                  onChange={handleSelectChange}
                  placeholder="Busque y seleccione un alumno"
                  required
                />
              ) : (
                <SearchableSelect
                  label="Seleccionar Personal/Profesor"
                  options={padres.map(padre => ({
                    value: padre.id,
                    label: padre.nombre
                  }))}
                  value={selectedId}
                  onChange={handleSelectChange}
                  placeholder="Busque y seleccione personal"
                  required
                />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedId || loading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full p-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Confirmar Eliminación
                </h3>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>Miembro:</strong> {selectedNombre}
                </p>

                {invitacionesInfo && (
                  <>
                    <p className="text-sm text-gray-700">
                      <strong>Invitaciones a eliminar:</strong> {invitacionesInfo.count}
                    </p>

                    {invitacionesInfo.count > 0 && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <strong>Rango de fechas:</strong> Desde {new Date(invitacionesInfo.fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} hasta {new Date(invitacionesInfo.fechaFin).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  Esta acción no se puede deshacer. Todas las invitaciones futuras de este miembro serán eliminadas permanentemente.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  disabled={isSubmitting}
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
