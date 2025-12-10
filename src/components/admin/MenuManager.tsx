import React, { useState, useEffect } from 'react';
import { supabase, OpcionMenuPrincipal, OpcionMenuGuarnicion } from '../../lib/supabase';
import { ChefHat, Plus, Edit, Trash2, Check, X, Utensils, Calendar, AlertTriangle, Search, Settings, Power, PowerOff } from 'lucide-react';

interface OpcionAgrupada {
  nombre: string;
  dias: number[];
  orden: number;
  activo: boolean;
  ids: number[];
  eleccionesFuturas?: number;
}

export function MenuManager() {
  const [opcionesPrincipales, setOpcionesPrincipales] = useState<OpcionMenuPrincipal[]>([]);
  const [opcionesGuarnicion, setOpcionesGuarnicion] = useState<OpcionMenuGuarnicion[]>([]);
  const [eleccionesFuturas, setEleccionesFuturas] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'principales' | 'guarniciones'>('principales');
  const [showForm, setShowForm] = useState(false);
  const [editingOpcion, setEditingOpcion] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [opcionToDelete, setOpcionToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    dia_semana: 1,
    dias_semana_multi: [] as number[],
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

      const { data: principalesData, error: principalesError } = await supabase
        .rpc('admin_load_all_opciones_principales');

      if (principalesError) throw principalesError;
      setOpcionesPrincipales(principalesData || []);

      const { data: guarnicionData, error: guarnicionError } = await supabase
        .rpc('admin_load_all_opciones_guarnicion');

      if (guarnicionError) throw guarnicionError;
      setOpcionesGuarnicion(guarnicionData || []);

      await loadEleccionesFuturas();

    } catch (error) {
      console.error('Error loading menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEleccionesFuturas = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      const { data: principalesData, error: principalesError } = await supabase
        .from('comedor_menupersonalizado')
        .select('opcion_principal_id')
        .gte('fecha', hoy);

      if (principalesError) throw principalesError;

      const { data: guarnicionData, error: guarnicionError } = await supabase
        .from('comedor_menupersonalizado')
        .select('opcion_guarnicion_id')
        .gte('fecha', hoy);

      if (guarnicionError) throw guarnicionError;

      const conteos = new Map<string, number>();

      principalesData?.forEach((item: any) => {
        const id = item.opcion_principal_id;
        conteos.set(`p_${id}`, (conteos.get(`p_${id}`) || 0) + 1);
      });

      guarnicionData?.forEach((item: any) => {
        const id = item.opcion_guarnicion_id;
        conteos.set(`g_${id}`, (conteos.get(`g_${id}`) || 0) + 1);
      });

      setEleccionesFuturas(conteos);
    } catch (error) {
      console.error('Error loading future selections:', error);
    }
  };

  const agruparOpcionesPrincipales = (): OpcionAgrupada[] => {
    const grupos = new Map<string, OpcionAgrupada>();

    opcionesPrincipales.forEach(opcion => {
      if (grupos.has(opcion.nombre)) {
        const grupo = grupos.get(opcion.nombre)!;
        grupo.dias.push(opcion.dia_semana);
        grupo.ids.push(opcion.id);
      } else {
        grupos.set(opcion.nombre, {
          nombre: opcion.nombre,
          dias: [opcion.dia_semana],
          orden: opcion.orden,
          activo: opcion.activo,
          ids: [opcion.id]
        });
      }
    });

    return Array.from(grupos.values())
      .map(grupo => {
        const totalElecciones = grupo.ids.reduce((sum, id) => {
          return sum + (eleccionesFuturas.get(`p_${id}`) || 0);
        }, 0);

        return {
          ...grupo,
          dias: grupo.dias.sort(),
          eleccionesFuturas: totalElecciones
        };
      })
      .sort((a, b) => a.orden - b.orden);
  };

  const agruparOpcionesGuarnicion = (): OpcionAgrupada[] => {
    return opcionesGuarnicion
      .map(opcion => ({
        nombre: opcion.nombre,
        dias: [],
        orden: opcion.orden,
        activo: opcion.activo,
        ids: [opcion.id],
        eleccionesFuturas: eleccionesFuturas.get(`g_${opcion.id}`) || 0
      }))
      .sort((a, b) => a.orden - b.orden);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'principales' && formData.dias_semana_multi.length === 0) {
      alert('Debes seleccionar al menos un día de la semana');
      return;
    }

    try {
      if (editingOpcion) {
        if (activeTab === 'principales') {
          const { data: opcionesExistentes, error: queryError } = await supabase
            .from('opciones_menu_principal')
            .select('id')
            .eq('nombre', editingOpcion);

          if (queryError) throw queryError;

          if (opcionesExistentes) {
            for (const opcion of opcionesExistentes) {
              await supabase.rpc('admin_delete_opcion_principal', {
                opcion_id: opcion.id
              });
            }
          }

          const { error } = await supabase
            .rpc('admin_insert_opcion_principal_multi_dias', {
              new_nombre: formData.nombre,
              new_dias_semana: formData.dias_semana_multi,
              new_orden: formData.orden,
              new_activo: formData.activo
            });
          if (error) throw error;
        } else {
          const opcion = opcionesGuarnicion.find(o => o.nombre === editingOpcion);
          if (opcion) {
            const { error } = await supabase
              .rpc('admin_update_opcion_guarnicion', {
                opcion_id: opcion.id,
                new_nombre: formData.nombre,
                new_orden: formData.orden,
                new_activo: formData.activo
              });
            if (error) throw error;
          }
        }
      } else {
        if (activeTab === 'principales') {
          const { error } = await supabase
            .rpc('admin_insert_opcion_principal_multi_dias', {
              new_nombre: formData.nombre,
              new_dias_semana: formData.dias_semana_multi,
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

      setFormData({ nombre: '', dia_semana: 1, dias_semana_multi: [], orden: 0, activo: true });
      setShowForm(false);
      setEditingOpcion(null);
      loadData();
    } catch (error) {
      console.error('Error saving menu option:', error);
      alert('Error al guardar: ' + (error as Error).message);
    }
  };

  const handleEdit = (opcionAgrupada: OpcionAgrupada) => {
    setEditingOpcion(opcionAgrupada.nombre);
    setFormData({
      nombre: opcionAgrupada.nombre,
      dia_semana: 1,
      dias_semana_multi: opcionAgrupada.dias,
      orden: opcionAgrupada.orden,
      activo: opcionAgrupada.activo
    });
    setShowForm(true);
  };

  const handleDeleteClick = (opcionAgrupada: OpcionAgrupada) => {
    setOpcionToDelete(opcionAgrupada.nombre);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!opcionToDelete) return;
    try {
      if (activeTab === 'principales') {
        const opcionesAEliminar = opcionesPrincipales.filter(o => o.nombre === opcionToDelete);
        for (const opcion of opcionesAEliminar) {
          const { error } = await supabase
            .rpc('admin_delete_opcion_principal', {
              opcion_id: opcion.id
            });
          if (error) throw error;
        }
      } else {
        const opcion = opcionesGuarnicion.find(o => o.nombre === opcionToDelete);
        if (opcion) {
          const { error } = await supabase
            .rpc('admin_delete_opcion_guarnicion', {
              opcion_id: opcion.id
            });
          if (error) throw error;
        }
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

  const toggleActivo = async (opcionAgrupada: OpcionAgrupada) => {
    try {
      const nuevoEstado = !opcionAgrupada.activo;

      if (activeTab === 'principales') {
        for (const id of opcionAgrupada.ids) {
          const { error } = await supabase
            .rpc('admin_update_opcion_principal_activo', {
              opcion_id: id,
              new_activo: nuevoEstado
            });
          if (error) throw error;
        }
      } else {
        for (const id of opcionAgrupada.ids) {
          const { error } = await supabase
            .rpc('admin_update_opcion_guarnicion_activo', {
              opcion_id: id,
              new_activo: nuevoEstado
            });
          if (error) throw error;
        }
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

  const opcionesAgrupadas = activeTab === 'principales'
    ? agruparOpcionesPrincipales()
    : agruparOpcionesGuarnicion();

  const opcionesFiltradas = opcionesAgrupadas.filter(opcion =>
    opcion.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            setFormData({ nombre: '', dia_semana: 1, dias_semana_multi: [], orden: 0, activo: true });
          }}
          className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Opción</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => {
              setActiveTab('principales');
              setSearchTerm('');
            }}
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
            onClick={() => {
              setActiveTab('guarniciones');
              setSearchTerm('');
            }}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar ${activeTab === 'principales' ? 'platos principales' : 'guarniciones'}...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingOpcion ? 'Editar Opción' : 'Nueva Opción'} - {activeTab === 'principales' ? 'Plato Principal' : 'Guarnición'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de la semana
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {diasSemana.map((dia) => {
                    const isSelected = formData.dias_semana_multi.includes(dia.value);
                    return (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            dias_semana_multi: isSelected
                              ? prev.dias_semana_multi.filter(d => d !== dia.value)
                              : [...prev.dias_semana_multi, dia.value].sort()
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                          isSelected
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {dia.label}
                      </button>
                    );
                  })}
                </div>
                {formData.dias_semana_multi.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">Debes seleccionar al menos un día</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                <label htmlFor="activo" className="ml-2 text-sm font-medium text-gray-700">Activo</label>
              </div>
            </div>
            <div className="flex space-x-3">
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

      {opcionesFiltradas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron resultados' : `No hay ${activeTab === 'principales' ? 'platos principales' : 'guarniciones'} registrados`}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Intenta con otro término de búsqueda'
                : `Comienza agregando ${activeTab === 'principales' ? 'el primer plato principal' : 'la primera guarnición'} al menú`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {opcionesFiltradas.map((opcion) => (
            <div
              key={opcion.nombre}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{opcion.nombre}</h3>
                    <button
                      onClick={() => toggleActivo(opcion)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        opcion.activo
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
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
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Calendar className="h-3 w-3 mr-1" />
                      {opcion.eleccionesFuturas || 0} elegidos
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {activeTab === 'principales' && opcion.dias.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {opcion.dias.map(dia => {
                            const diaLabel = diasSemana.find(d => d.value === dia)?.label || '';
                            return (
                              <span
                                key={dia}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {diaLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-500">Orden:</span>
                      <span className="font-medium text-gray-700">{opcion.orden}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(opcion)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(opcion)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && opcionToDelete && (
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
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="font-medium text-gray-900">{opcionToDelete}</div>
                <div className="text-sm text-gray-600">
                  Tipo: {activeTab === 'principales' ? 'Plato Principal' : 'Guarnición'}
                </div>
                {activeTab === 'principales' && (() => {
                  const opcion = opcionesAgrupadas.find(o => o.nombre === opcionToDelete);
                  if (opcion && opcion.dias.length > 0) {
                    return (
                      <div className="text-sm text-gray-600 mt-1">
                        <span>Días: </span>
                        {opcion.dias.map(dia => diasSemana.find(d => d.value === dia)?.label).join(', ')}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      ADVERTENCIA: Eliminación en cascada
                    </h4>
                    <div className="text-sm text-red-700 space-y-1">
                      <p>Al eliminar esta opción de menú también se eliminarán:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Todas las <strong>elecciones de menú</strong> que usen esta opción</li>
                        {activeTab === 'principales' && (
                          <li>Los registros en <strong>todos los días</strong> de la semana donde aparece</li>
                        )}
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