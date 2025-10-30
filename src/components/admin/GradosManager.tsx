import React, { useState, useEffect } from 'react';
import { supabase, Grado } from '../../lib/supabase';
import { GraduationCap, Plus, CreditCard as Edit, Trash2, Check, X, ChefHat, AlertTriangle } from 'lucide-react';

export function GradosManager() {
  const [grados, setGrados] = useState<Grado[]>([]);
  const [hijosCount, setHijosCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGrado, setEditingGrado] = useState<Grado | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gradoToDelete, setGradoToDelete] = useState<Grado | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    orden: 0,
    activo: true,
    tiene_opcion_menu: false
  });

  useEffect(() => {
    loadGrados();
  }, []);

  const loadGrados = async () => {
    try {
      setLoading(true);
     
     console.log('🔍 Cargando todos los grados...');
      // Use RPC function to bypass RLS and load all grados
      const { data, error } = await supabase
        .rpc('admin_load_all_grados');

      if (error) throw error;
     console.log('📊 Grados cargados:', data?.length, 'grados encontrados');
      console.log('📋 Detalle grados:', data?.map(g => ({ 
        id: g.id, 
        nombre: g.nombre, 
        activo: g.activo, 
        orden: g.orden 
      })));
      setGrados(data || []);

      // Cargar el conteo de hijos para cada grado
      if (data && data.length > 0) {
        const { data: hijosData, error: hijosError } = await supabase
          .from('hijos')
         .select('grado_id, activo');

        if (hijosError) {
          console.error('Error loading hijos count:', hijosError);
        } else {
          const counts: Record<string, number> = {};
          hijosData?.forEach(hijo => {
           // Contar todos los hijos, no solo los activos
           counts[hijo.grado_id] = (counts[hijo.grado_id] || 0) + 1;
          });
          setHijosCount(counts);
        }
      }
    } catch (error) {
      console.error('Error loading grados:', error);
    } finally {
      setLoading(false);
    }
    
    console.log('🎯 Estado final de grados en componente:', grados.map(g => ({ 
      nombre: g.nombre, 
      activo: g.activo 
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingGrado) {
        const { error } = await supabase
          .from('grados')
          .update(formData)
          .eq('id', editingGrado.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grados')
          .insert([formData]);
        
        if (error) throw error;
      }

      setFormData({ nombre: '', orden: 0, activo: true, tiene_opcion_menu: false });
      setShowForm(false);
      setEditingGrado(null);
      loadGrados();
    } catch (error) {
      console.error('Error saving grado:', error);
    }
  };

  const handleEdit = (grado: Grado) => {
    setEditingGrado(grado);
    setFormData({
      nombre: grado.nombre,
      orden: grado.orden,
      activo: grado.activo,
      tiene_opcion_menu: grado.tiene_opcion_menu
    });
    setShowForm(true);
  };

  const handleDeleteClick = (grado: Grado) => {
    setGradoToDelete(grado);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!gradoToDelete) return;
    try {
      const { error } = await supabase
        .from('grados')
        .delete()
        .eq('id', gradoToDelete.id);

      if (error) throw error;
      loadGrados();
    } catch (error) {
      console.error('Error deleting grado:', error);
    } finally {
      setShowDeleteModal(false);
      setGradoToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setGradoToDelete(null);
  };

  const toggleActivo = async (grado: Grado) => {
    try {
      // Use RPC function with elevated privileges
      const { error } = await supabase
        .rpc('admin_update_grado_activo', {
          grado_id: grado.id,
          new_activo: !grado.activo
        });

      if (error) throw error;
      loadGrados();
    } catch (error) {
      console.error('Error updating grado status:', error);
    }
  };

  const toggleOpcionMenu = async (grado: Grado) => {
    try {
      // Use RPC function with elevated privileges
      const { error } = await supabase
        .rpc('admin_update_grado_menu_option', {
          grado_id: grado.id,
          new_tiene_opcion_menu: !grado.tiene_opcion_menu
        });

      if (error) throw error;
      loadGrados();
    } catch (error) {
      console.error('Error updating grado menu option:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Cursos</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingGrado(null);
            setFormData({ nombre: '', orden: 0, activo: true, tiene_opcion_menu: false });
          }}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Curso</span>
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingGrado ? 'Editar Curso' : 'Nuevo Curso'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="ej: 1º Primaria"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="tiene_opcion_menu"
                checked={formData.tiene_opcion_menu}
                onChange={(e) => setFormData(prev => ({ ...prev, tiene_opcion_menu: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="tiene_opcion_menu" className="text-sm font-medium text-gray-700">
                Puede elegir menú
              </label>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingGrado ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingGrado(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de grados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alumnos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Menú
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grados.map((grado) => (
                <tr key={grado.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{grado.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{grado.orden}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {hijosCount[grado.id] || 0} {hijosCount[grado.id] === 1 ? 'alumno' : 'alumnos'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActivo(grado)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        grado.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {grado.activo ? (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleOpcionMenu(grado)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        grado.tiene_opcion_menu
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <ChefHat className="h-3 w-3 mr-1" />
                      {grado.tiene_opcion_menu ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(grado)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(grado)}
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

      {grados.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cursos registrados</h3>
          <p className="text-gray-600">Comienza agregando el primer curso al sistema</p>
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
                ¿Estás seguro de que quieres eliminar este curso?
              </p>
              {gradoToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{gradoToDelete.nombre}</div>
                  <div className="text-sm text-gray-600">
                    Orden: {gradoToDelete.orden}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <ChefHat className="h-3 w-3 mr-1" />
                    {gradoToDelete.tiene_opcion_menu ? 'Puede elegir menú' : 'No puede elegir menú'}
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      ⚠️ ADVERTENCIA: Eliminación en cascada
                    </h4>
                    <div className="text-sm text-red-700 space-y-1">
                      <p>Al eliminar este curso también se eliminarán:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Todos los <strong>hijos</strong> asignados a este curso</li>
                        <li>Todas las <strong>bajas de comedor</strong> de esos hijos</li>
                        <li>Todas las <strong>solicitudes puntuales</strong> de esos hijos</li>
                        <li>Todas las <strong>elecciones de menú</strong> de esos hijos</li>
                        <li>Todas las <strong>solicitudes de dieta blanda</strong> de esos hijos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800 font-medium">
                    Esta acción no se puede deshacer y eliminará permanentemente todos los datos relacionados.
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