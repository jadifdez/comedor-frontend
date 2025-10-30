import React, { useState, useEffect } from 'react';
import { supabase, OpcionMenuPrincipal, OpcionMenuGuarnicion } from '../../lib/supabase';
import { ChefHat, Plus, Edit, Trash2, Check, X, Utensils, Calendar, AlertTriangle } from 'lucide-react';

export function MenuManager() {
  const [opcionesPrincipales, setOpcionesPrincipales] = useState<OpcionMenuPrincipal[]>([]);
  const [opcionesGuarnicion, setOpcionesGuarnicion] = useState<OpcionMenuGuarnicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'principales' | 'guarniciones'>('principales');
  const [showForm, setShowForm] = useState(false);
  const [editingOpcion, setEditingOpcion] = useState<OpcionMenuPrincipal | OpcionMenuGuarnicion | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [opcionToDelete, setOpcionToDelete] = useState<OpcionMenuPrincipal | OpcionMenuGuarnicion | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    dia_semana: 1,
    orden: 0,
    activo: true
  });

  const diasSemana = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🍽️ Cargando todas las opciones de menú...');
      
      // Cargar opciones principales usando RPC para bypasear RLS
      const { data: principalesData, error: principalesError } = await supabase
        .rpc('admin_load_all_opciones_principales');

      if (principalesError) throw principalesError;
      console.log('🥘 Opciones principales cargadas:', principalesData?.length, 'opciones encontradas');
      console.log('📋 Detalle principales:', principalesData?.map(o => ({ 
        id: o.id, 
        nombre: o.nombre, 
        activo: o.activo, 
        dia_semana: o.dia_semana 
      })));
      setOpcionesPrincipales(principalesData || []);

      // Cargar opciones de guarnición usando RPC para bypasear RLS
      const { data: guarnicionData, error: guarnicionError } = await supabase
        .rpc('admin_load_all_opciones_guarnicion');

      if (guarnicionError) throw guarnicionError;
      console.log('🥗 Opciones guarnición cargadas:', guarnicionData?.length, 'opciones encontradas');
      console.log('📋 Detalle guarnición:', guarnicionData?.map(o => ({ 
        id: o.id, 
        nombre: o.nombre, 
        activo: o.activo 
      })));
      setOpcionesGuarnicion(guarnicionData || []);

    } catch (error) {
      console.error('Error loading menu data:', error);
    } finally {
      setLoading(false);
    }
    
    console.log('🎯 Estado final de opciones principales en componente:', opcionesPrincipales.map(o => ({ 
      nombre: o.nombre, 
      activo: o.activo 
    })));
    console.log('🎯 Estado final de opciones guarnición en componente:', opcionesGuarnicion.map(o => ({ 
      nombre: o.nombre, 
      activo: o.activo 
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingOpcion) {
        // Use RPC functions for updates to bypass RLS
        if (activeTab === 'principales') {
          const { error } = await supabase
            .rpc('admin_update_opcion_principal', {
              opcion_id: editingOpcion.id,
              new_nombre: formData.nombre,
              new_dia_semana: formData.dia_semana,
              new_orden: formData.orden,
              new_activo: formData.activo
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .rpc('admin_update_opcion_guarnicion', {
              opcion_id: editingOpcion.id,
              new_nombre: formData.nombre,
              new_orden: formData.orden,
              new_activo: formData.activo
            });
          if (error) throw error;
        }
      } else {
        // Use RPC functions for new items to bypass RLS
        if (activeTab === 'principales') {
          const { error } = await supabase
            .rpc('admin_insert_opcion_principal', {
              new_nombre: formData.nombre,
              new_dia_semana: formData.dia_semana,
              new_orden: formData.orden,
              new_activo: formData.activo
            });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .rpc('admin_insert_opcion_guarnicion', {
              new_nombre: formData.nombre,
              new_orden: formData.orden,
              new_activo: formData.activo
            });
          if (error) throw error;
        }
      }

      setFormData({ nombre: '', dia_semana: 1, orden: 0, activo: true });
      setShowForm(false);
      setEditingOpcion(null);
      loadData();
    } catch (error) {
      console.error('Error saving menu option:', error);
    }
  };

  const handleEdit = (opcion: OpcionMenuPrincipal | OpcionMenuGuarnicion) => {
    setEditingOpcion(opcion);
    setFormData({
      nombre: opcion.nombre,
      dia_semana: 'dia_semana' in opcion ? opcion.dia_semana : 1,
      orden: opcion.orden,
      activo: opcion.activo
    });
    setShowForm(true);
  };

  const handleDeleteClick = (opcion: OpcionMenuPrincipal | OpcionMenuGuarnicion) => {
    setOpcionToDelete(opcion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!opcionToDelete) return;
    try {
      if (activeTab === 'principales') {
        const { error } = await supabase
          .rpc('admin_delete_opcion_principal', {
            opcion_id: opcionToDelete.id
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .rpc('admin_delete_opcion_guarnicion', {
            opcion_id: opcionToDelete.id
          });
        if (error) throw error;
      }

      loadData();
    } catch (error) {
      console.error('Error deleting menu option:', error);
    } finally {
      setShowDeleteModal(false);
      setOpcionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setOpcionToDelete(null);
  };

  const toggleActivo = async (opcion: OpcionMenuPrincipal | OpcionMenuGuarnicion) => {
    try {
      if (activeTab === 'principales') {
        // Use RPC function with elevated privileges for main dishes
        const { error } = await supabase
          .rpc('admin_update_opcion_principal_activo', {
            opcion_id: opcion.id,
            new_activo: !opcion.activo
          });
        if (error) throw error;
      } else {
        // Use RPC function with elevated privileges for side dishes
        const { error } = await supabase
          .rpc('admin_update_opcion_guarnicion_activo', {
            opcion_id: opcion.id,
            new_activo: !opcion.activo
          });
        if (error) throw error;
      }

      loadData();
    } catch (error) {
      console.error('Error updating menu option status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-600 border-t-transparent"></div>
      </div>
    );
  }

  const currentOptions = activeTab === 'principales' ? opcionesPrincipales : opcionesGuarnicion;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChefHat className="h-6 w-6 text-yellow-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Menús</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingOpcion(null);
            setFormData({ nombre: '', dia_semana: 1, orden: 0, activo: true });
          }}
          className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Opción</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setActiveTab('principales')}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'principales'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Utensils className="h-5 w-5" />
            <span>Platos Principales</span>
          </button>
          <button
            onClick={() => setActiveTab('guarniciones')}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'guarniciones'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Guarniciones</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingOpcion ? 'Editar Opción' : 'Nueva Opción'} - {activeTab === 'principales' ? 'Plato Principal' : 'Guarnición'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="ej: Pollo a la plancha"
                required
              />
            </div>
            {activeTab === 'principales' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Día de la semana</label>
                <select
                  value={formData.dia_semana}
                  onChange={(e) => setFormData(prev => ({ ...prev, dia_semana: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData(prev => ({ ...prev, orden: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingOpcion ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingOpcion(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de opciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                {activeTab === 'principales' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Día
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
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
              {currentOptions.map((opcion) => (
                <tr key={opcion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opcion.nombre}</div>
                  </td>
                  {activeTab === 'principales' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {diasSemana.find(d => d.value === (opcion as OpcionMenuPrincipal).dia_semana)?.label}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{opcion.orden}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActivo(opcion)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        opcion.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {opcion.activo ? (
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
                        onClick={() => handleEdit(opcion)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(opcion)}
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

      {currentOptions.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay {activeTab === 'principales' ? 'platos principales' : 'guarniciones'} registrados
          </h3>
          <p className="text-gray-600">
            Comienza agregando {activeTab === 'principales' ? 'el primer plato principal' : 'la primera guarnición'} al menú
          </p>
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
                ¿Estás seguro de que quieres eliminar esta opción de menú?
              </p>
              {opcionToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{opcionToDelete.nombre}</div>
                  <div className="text-sm text-gray-600">
                    Tipo: {activeTab === 'principales' ? 'Plato Principal' : 'Guarnición'}
                  </div>
                  {'dia_semana' in opcionToDelete && (
                    <div className="text-sm text-gray-600">
                      Día: {['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][opcionToDelete.dia_semana]}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Orden: {opcionToDelete.orden}
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
                      <p>Al eliminar esta opción de menú también se eliminarán:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Todas las <strong>elecciones de menú</strong> que usen esta opción</li>
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