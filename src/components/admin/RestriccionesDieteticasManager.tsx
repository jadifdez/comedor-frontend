import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SuccessMessage } from '../SuccessMessage';

interface RestriccionDietetica {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'alergia' | 'restriccion';
  activo: boolean;
  created_at: string;
}

export function RestriccionesDieteticasManager() {
  const [restricciones, setRestricciones] = useState<RestriccionDietetica[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'alergia' as 'alergia' | 'restriccion',
    activo: true,
  });

  useEffect(() => {
    loadRestricciones();
  }, []);

  const loadRestricciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restricciones_dieteticas')
        .select('*')
        .order('tipo', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;
      setRestricciones(data || []);
    } catch (err) {
      console.error('Error loading dietary restrictions:', err);
      setError('Error al cargar las restricciones dietéticas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        const { error } = await supabase
          .from('restricciones_dieteticas')
          .update({
            nombre: formData.nombre.trim(),
            tipo: formData.tipo,
            activo: formData.activo,
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccessMessage('Restricción actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('restricciones_dieteticas')
          .insert({
            nombre: formData.nombre.trim(),
            tipo: formData.tipo,
            activo: formData.activo,
          });

        if (error) throw error;
        setSuccessMessage('Restricción creada correctamente');
      }

      resetForm();
      loadRestricciones();
    } catch (err: any) {
      console.error('Error saving dietary restriction:', err);
      if (err.code === '23505') {
        setError('Ya existe una restricción con ese nombre');
      } else {
        setError('Error al guardar la restricción');
      }
    }
  };

  const handleEdit = (restriccion: RestriccionDietetica) => {
    setFormData({
      nombre: restriccion.nombre,
      tipo: restriccion.tipo,
      activo: restriccion.activo,
    });
    setEditingId(restriccion.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta restricción?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restricciones_dieteticas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('Restricción eliminada correctamente');
      loadRestricciones();
    } catch (err: any) {
      console.error('Error deleting dietary restriction:', err);
      if (err.code === '23503') {
        setError('No se puede eliminar esta restricción porque está asignada a uno o más alumnos');
      } else {
        setError('Error al eliminar la restricción');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: 'alergia',
      activo: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const alergias = restricciones.filter((r) => r.tipo === 'alergia');
  const restriccionesList = restricciones.filter((r) => r.tipo === 'restriccion');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando restricciones dietéticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restricciones Dietéticas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona las alergias y restricciones alimentarias disponibles
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? (
            <>
              <X className="h-5 w-5" />
              <span>Cancelar</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Nueva Restricción</span>
            </>
          )}
        </button>
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

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar Restricción' : 'Nueva Restricción'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value as 'alergia' | 'restriccion' })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="alergia">Alergia</option>
                <option value="restriccion">Restricción</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Alergia: Reacciones alérgicas (gluten, lactosa, frutos secos, etc.)
                <br />
                Restricción: Limitaciones dietéticas (no come cerdo, vegetariano, etc.)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Alergia al gluten, No come cerdo"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activo" className="text-sm text-gray-700">
                Activo (visible para los padres)
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>Alergias ({alergias.length})</span>
          </h3>

          {alergias.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay alergias registradas</p>
          ) : (
            <div className="space-y-2">
              {alergias.map((alergia) => (
                <div
                  key={alergia.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{alergia.nombre}</h4>
                      {!alergia.activo && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {alergia.descripcion && (
                      <p className="text-sm text-gray-600 mt-1">{alergia.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(alergia)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(alergia.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Check className="h-5 w-5 text-blue-500" />
            <span>Restricciones ({restriccionesList.length})</span>
          </h3>

          {restriccionesList.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay restricciones registradas</p>
          ) : (
            <div className="space-y-2">
              {restriccionesList.map((restriccion) => (
                <div
                  key={restriccion.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{restriccion.nombre}</h4>
                      {!restriccion.activo && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {restriccion.descripcion && (
                      <p className="text-sm text-gray-600 mt-1">{restriccion.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(restriccion)}
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(restriccion.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
