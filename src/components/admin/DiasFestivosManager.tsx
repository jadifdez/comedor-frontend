import React, { useState, useEffect } from 'react';
import { supabase, DiaFestivo } from '../../lib/supabase';
import { Calendar, Plus, CreditCard as Edit, Trash2, Check, X, Search, AlertTriangle } from 'lucide-react';

export function DiasFestivosManager() {
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDia, setEditingDia] = useState<DiaFestivo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [diaToDelete, setDiaToDelete] = useState<DiaFestivo | null>(null);
  const [isPeriodo, setIsPeriodo] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    fechaInicio: '',
    fechaFin: '',
    nombre: '',
    activo: true
  });

  useEffect(() => {
    loadDiasFestivos();
  }, []);

  const loadDiasFestivos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('dias_festivos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setDiasFestivos(data || []);
    } catch (error) {
      console.error('Error loading días festivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDia) {
        const dataToUpdate = isPeriodo
          ? { nombre: formData.nombre, activo: formData.activo }
          : formData;
        const { error } = await supabase
          .from('dias_festivos')
          .update(dataToUpdate)
          .eq('id', editingDia.id);

        if (error) throw error;
      } else {
        if (isPeriodo && formData.fechaInicio && formData.fechaFin) {
          const fechas = [];
          const inicio = new Date(formData.fechaInicio + 'T00:00:00');
          const fin = new Date(formData.fechaFin + 'T00:00:00');

          for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
            fechas.push({
              fecha: d.toISOString().split('T')[0],
              nombre: formData.nombre,
              activo: formData.activo
            });
          }

          const { error } = await supabase
            .from('dias_festivos')
            .insert(fechas);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('dias_festivos')
            .insert([{
              fecha: formData.fecha,
              nombre: formData.nombre,
              activo: formData.activo
            }]);

          if (error) throw error;
        }
      }

      setFormData({ fecha: '', fechaInicio: '', fechaFin: '', nombre: '', activo: true });
      setIsPeriodo(false);
      setShowForm(false);
      setEditingDia(null);
      loadDiasFestivos();
    } catch (error) {
      console.error('Error saving día festivo:', error);
    }
  };

  const handleEdit = (dia: DiaFestivo) => {
    setEditingDia(dia);
    setIsPeriodo(false);
    setFormData({
      fecha: dia.fecha,
      fechaInicio: '',
      fechaFin: '',
      nombre: dia.nombre,
      activo: dia.activo
    });
    setShowForm(true);
  };

  const handleDeleteClick = (dia: DiaFestivo) => {
    setDiaToDelete(dia);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!diaToDelete) return;
    try {
      const { error } = await supabase
        .from('dias_festivos')
        .delete()
        .eq('id', diaToDelete.id);

      if (error) throw error;
      loadDiasFestivos();
    } catch (error) {
      console.error('Error deleting día festivo:', error);
    } finally {
      setShowDeleteModal(false);
      setDiaToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDiaToDelete(null);
  };

  const toggleActivo = async (dia: DiaFestivo) => {
    try {
      const { error } = await supabase
        .from('dias_festivos')
        .update({ activo: !dia.activo })
        .eq('id', dia.id);

      if (error) throw error;
      loadDiasFestivos();
    } catch (error) {
      console.error('Error updating día festivo status:', error);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredDias = diasFestivos.filter(dia =>
    dia.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatFecha(dia.fecha).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Días Festivos</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingDia(null);
            setIsPeriodo(false);
            setFormData({ fecha: '', fechaInicio: '', fechaFin: '', nombre: '', activo: true });
          }}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Día Festivo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o fecha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingDia ? 'Editar Día Festivo' : 'Nuevo Día Festivo'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingDia && (
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isPeriodo}
                    onChange={() => setIsPeriodo(false)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Día único</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isPeriodo}
                    onChange={() => setIsPeriodo(true)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Periodo de días</span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isPeriodo ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                    disabled={editingDia !== null}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                    <input
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                    <input
                      type="date"
                      value={formData.fechaFin}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaFin: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                      min={formData.fechaInicio}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="ej: Navidad, Vacaciones de verano"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingDia ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDia(null);
                  setIsPeriodo(false);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de días festivos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDias.map((dia) => (
                <tr key={dia.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatFecha(dia.fecha)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dia.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActivo(dia)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        dia.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {dia.activo ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Inactivo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(dia)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dia)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDias.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay días festivos registrados</h3>
          <p className="text-gray-600">Comienza agregando el primer día festivo al sistema</p>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar eliminación
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que quieres eliminar este día festivo?
              </p>
              {diaToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{diaToDelete.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {formatFecha(diaToDelete.fecha)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Fecha: {diaToDelete.fecha}
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800 font-medium">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}