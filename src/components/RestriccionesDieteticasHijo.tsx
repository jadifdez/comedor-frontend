import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SuccessMessage } from './SuccessMessage';

interface Hijo {
  id: string;
  nombre: string;
  grado_nombre: string;
}

interface RestriccionDietetica {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'alergia' | 'restriccion';
}

interface RestriccionAsignada {
  id: string;
  restriccion_id: string;
  notas_adicionales: string | null;
  fecha_asignacion: string;
  restriccion: RestriccionDietetica;
}

export function RestriccionesDieteticasHijo() {
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [hijoSeleccionado, setHijoSeleccionado] = useState<string>('');
  const [restriccionesDisponibles, setRestriccionesDisponibles] = useState<RestriccionDietetica[]>([]);
  const [restriccionesAsignadas, setRestriccionesAsignadas] = useState<RestriccionAsignada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [restriccionToDelete, setRestriccionToDelete] = useState<{ id: string; nombre: string } | null>(null);

  const [formData, setFormData] = useState({
    restriccion_id: '',
  });

  useEffect(() => {
    loadHijos();
    loadRestriccionesDisponibles();
  }, []);

  useEffect(() => {
    if (hijoSeleccionado) {
      loadRestriccionesAsignadas(hijoSeleccionado);
    }
  }, [hijoSeleccionado]);

  const loadHijos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: padreData } = await supabase
        .from('padres')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!padreData) return;

      const { data, error } = await supabase
        .from('hijos')
        .select(`
          id,
          nombre,
          grados:grado_id (
            nombre
          )
        `)
        .eq('padre_id', padreData.id)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;

      const hijosFormateados = data.map((hijo: any) => ({
        id: hijo.id,
        nombre: hijo.nombre,
        grado_nombre: hijo.grados?.nombre || 'Sin grado',
      }));

      setHijos(hijosFormateados);

      if (hijosFormateados.length > 0 && !hijoSeleccionado) {
        setHijoSeleccionado(hijosFormateados[0].id);
      }
    } catch (err) {
      console.error('Error loading children:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRestriccionesDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('restricciones_dieteticas')
        .select('*')
        .eq('activo', true)
        .order('tipo')
        .order('nombre');

      if (error) throw error;
      setRestriccionesDisponibles(data || []);
    } catch (err) {
      console.error('Error loading available restrictions:', err);
    }
  };

  const loadRestriccionesAsignadas = async (hijoId: string) => {
    try {
      const { data, error } = await supabase
        .from('hijos_restricciones_dieteticas')
        .select(`
          id,
          restriccion_id,
          notas_adicionales,
          fecha_asignacion,
          restriccion:restriccion_id (
            id,
            nombre,
            descripcion,
            tipo
          )
        `)
        .eq('hijo_id', hijoId);

      if (error) throw error;
      setRestriccionesAsignadas(data as any || []);
    } catch (err) {
      console.error('Error loading assigned restrictions:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hijoSeleccionado || !formData.restriccion_id) {
      setError('Por favor, selecciona una restricción');
      return;
    }

    try {
      const { error } = await supabase
        .from('hijos_restricciones_dieteticas')
        .insert({
          hijo_id: hijoSeleccionado,
          restriccion_id: formData.restriccion_id,
        });

      if (error) throw error;

      setSuccessMessage('Restricción añadida correctamente');
      setFormData({ restriccion_id: '' });
      setShowAddForm(false);
      loadRestriccionesAsignadas(hijoSeleccionado);
    } catch (err: any) {
      console.error('Error adding restriction:', err);
      if (err.code === '23505') {
        setError('Esta restricción ya está asignada a este alumno');
      } else {
        setError('Error al añadir la restricción');
      }
    }
  };

  const handleDeleteClick = (id: string, nombre: string) => {
    setRestriccionToDelete({ id, nombre });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!restriccionToDelete) return;

    try {
      const { error } = await supabase
        .from('hijos_restricciones_dieteticas')
        .delete()
        .eq('id', restriccionToDelete.id);

      if (error) throw error;

      setSuccessMessage('Restricción eliminada correctamente');
      loadRestriccionesAsignadas(hijoSeleccionado);
      setShowDeleteModal(false);
      setRestriccionToDelete(null);
    } catch (err) {
      console.error('Error deleting restriction:', err);
      setError('Error al eliminar la restricción');
      setShowDeleteModal(false);
      setRestriccionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRestriccionToDelete(null);
  };

  const restriccionesDisponiblesParaAñadir = restriccionesDisponibles.filter(
    (rd) => !restriccionesAsignadas.some((ra) => ra.restriccion_id === rd.id)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (hijos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No tienes hijos registrados en el sistema.</p>
      </div>
    );
  }

  const hijoActual = hijos.find((h) => h.id === hijoSeleccionado);
  const alergias = restriccionesAsignadas.filter((r) => r.restriccion.tipo === 'alergia');
  const restricciones = restriccionesAsignadas.filter((r) => r.restriccion.tipo === 'restriccion');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Restricciones Dietéticas</h2>
        <p className="text-sm text-gray-600 mt-1">
          Informa al colegio sobre las alergias y restricciones alimentarias de tus hijos
        </p>
      </div>

      {successMessage && (
        <SuccessMessage
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecciona un hijo
        </label>
        <select
          value={hijoSeleccionado}
          onChange={(e) => setHijoSeleccionado(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {hijos.map((hijo) => (
            <option key={hijo.id} value={hijo.id}>
              {hijo.nombre} - {hijo.grado_nombre}
            </option>
          ))}
        </select>
      </div>

      {hijoActual && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Restricciones de {hijoActual.nombre}
            </h3>
            {restriccionesDisponiblesParaAñadir.length > 0 && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showAddForm ? (
                  <>
                    <X className="h-5 w-5" />
                    <span>Cancelar</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Añadir Restricción</span>
                  </>
                )}
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restricción *
                  </label>
                  <select
                    value={formData.restriccion_id}
                    onChange={(e) =>
                      setFormData({ ...formData, restriccion_id: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona una restricción</option>
                    {restriccionesDisponiblesParaAñadir.map((restriccion) => (
                      <option key={restriccion.id} value={restriccion.id}>
                        {restriccion.tipo === 'alergia' ? '🔴' : '🔵'} {restriccion.nombre}
                        {restriccion.descripcion && ` - ${restriccion.descripcion}`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Añadir Restricción
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span>Alergias ({alergias.length})</span>
              </h4>

              {alergias.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay alergias registradas</p>
              ) : (
                <div className="space-y-3">
                  {alergias.map((alergia) => (
                    <div
                      key={alergia.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">
                            {alergia.restriccion.nombre}
                          </h5>
                          {alergia.restriccion.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">
                              {alergia.restriccion.descripcion}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Añadido: {new Date(alergia.fecha_asignacion).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(alergia.id, alergia.restriccion.nombre)}
                          className="text-red-600 hover:text-red-700 ml-4"
                          title="Eliminar"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Check className="h-5 w-5 text-blue-500" />
                <span>Restricciones ({restricciones.length})</span>
              </h4>

              {restricciones.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay restricciones registradas</p>
              ) : (
                <div className="space-y-3">
                  {restricciones.map((restriccion) => (
                    <div
                      key={restriccion.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">
                            {restriccion.restriccion.nombre}
                          </h5>
                          {restriccion.restriccion.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">
                              {restriccion.restriccion.descripcion}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Añadido: {new Date(restriccion.fecha_asignacion).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(restriccion.id, restriccion.restriccion.nombre)}
                          className="text-blue-600 hover:text-blue-700 ml-4"
                          title="Eliminar"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showDeleteModal && restriccionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Eliminar restricción
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  ¿Estás seguro de que deseas eliminar <span className="font-medium">"{restriccionToDelete.nombre}"</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancelDelete}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
