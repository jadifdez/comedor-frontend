import React, { useState, useEffect } from 'react';
import { supabase, Hijo, Padre, Grado, InscripcionComedor } from '../../lib/supabase';
import { UserCheck, Plus, CreditCard as Edit, Trash2, User, GraduationCap, Check, X, Search, AlertTriangle, Utensils, Calendar } from 'lucide-react';
import { useConfiguracionPrecios } from '../../hooks/useConfiguracionPrecios';

export function HijosManager() {
  const { getPrecioPorDias } = useConfiguracionPrecios();
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [inscripcionesComedor, setInscripcionesComedor] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHijo, setEditingHijo] = useState<Hijo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrado, setFilterGrado] = useState<string>('');
  const [filterInscripcion, setFilterInscripcion] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hijoToDelete, setHijoToDelete] = useState<Hijo | null>(null);
  const [showComedorModal, setShowComedorModal] = useState(false);
  const [selectedHijoForComedor, setSelectedHijoForComedor] = useState<Hijo | null>(null);
  const [comedorFormData, setComedorFormData] = useState({
    diasSemana: [] as number[]
  });
  const [formData, setFormData] = useState({
    nombre: '',
    padre_id: '',
    grado_id: '',
    activo: true
  });

  const diasSemanaOptions = [
    { value: 1, label: 'Lunes', short: 'L' },
    { value: 2, label: 'Martes', short: 'M' },
    { value: 3, label: 'Miércoles', short: 'X' },
    { value: 4, label: 'Jueves', short: 'J' },
    { value: 5, label: 'Viernes', short: 'V' },
  ];

  useEffect(() => {
    loadData();
    
    // Escuchar eventos para añadir hijo con padre pre-seleccionado
    const handleAddHijoToPadre = (event: CustomEvent) => {
      const { padreId, padreNombre } = event.detail;
      setFormData(prev => ({ ...prev, padre_id: padreId }));
      setShowForm(true);
      setEditingHijo(null);
    };

    // También revisar localStorage por si viene de otra navegación
    const selectedPadre = localStorage.getItem('selectedPadreForNewHijo');
    if (selectedPadre) {
      const { id } = JSON.parse(selectedPadre);
      setFormData(prev => ({ ...prev, padre_id: id }));
      localStorage.removeItem('selectedPadreForNewHijo');
      setShowForm(true);
      setEditingHijo(null);
    }

    window.addEventListener('addHijoToPadre', handleAddHijoToPadre as EventListener);
    
    return () => {
      window.removeEventListener('addHijoToPadre', handleAddHijoToPadre as EventListener);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar hijos con relaciones
      const { data: hijosData, error: hijosError } = await supabase
        .from('hijos')
        .select(`
          *,
          grado:grados(*),
          padre:padres(*)
        `)
        .order('nombre');

      if (hijosError) throw hijosError;
      setHijos(hijosData || []);

      // Cargar padres activos
      const { data: padresData, error: padresError } = await supabase
        .from('padres')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (padresError) throw padresError;
      setPadres(padresData || []);

      // Cargar grados activos
      const { data: gradosData, error: gradosError } = await supabase
        .from('grados')
        .select('*')
        .order('orden');

      if (gradosError) throw gradosError;
      setGrados(gradosData || []);

      // Cargar inscripciones de comedor
      const { data: inscripcionesData, error: inscripcionesError } = await supabase
        .from('comedor_inscripciones')
        .select('hijo_id, dias_semana, activo')
        .eq('activo', true);

      if (inscripcionesError) {
        console.error('Error loading inscripciones comedor:', inscripcionesError);
      } else {
        const inscripcionesMap: Record<string, any> = {};
        inscripcionesData?.forEach(inscripcion => {
          inscripcionesMap[inscripcion.hijo_id] = inscripcion;
        });
        setInscripcionesComedor(inscripcionesMap);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingHijo) {
        const { error } = await supabase
          .from('hijos')
          .update(formData)
          .eq('id', editingHijo.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hijos')
          .insert([formData]);
        
        if (error) throw error;
      }

      setFormData({ nombre: '', padre_id: '', grado_id: '', activo: true });
      setShowForm(false);
      setEditingHijo(null);
      loadData();
    } catch (error) {
      console.error('Error saving hijo:', error);
    }
  };

  const handleEdit = (hijo: Hijo) => {
    setEditingHijo(hijo);
    setFormData({
      nombre: hijo.nombre,
      padre_id: hijo.padre_id,
      grado_id: hijo.grado_id,
      activo: hijo.activo
    });
    setShowForm(true);
  };

  const handleDeleteClick = (hijo: Hijo) => {
    setHijoToDelete(hijo);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!hijoToDelete) return;
    try {
      const { error } = await supabase
        .from('hijos')
        .delete()
        .eq('id', hijoToDelete.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting hijo:', error);
    } finally {
      setShowDeleteModal(false);
      setHijoToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setHijoToDelete(null);
  };

  const toggleActivo = async (hijo: Hijo) => {
    try {
      const { error } = await supabase
        .from('hijos')
        .update({ activo: !hijo.activo })
        .eq('id', hijo.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating hijo status:', error);
    }
  };

  const handleComedorClick = (hijo: Hijo) => {
    setSelectedHijoForComedor(hijo);
    
    // Si ya tiene inscripción, cargar sus días
    const inscripcion = inscripcionesComedor[hijo.id];
    if (inscripcion) {
      setComedorFormData({ diasSemana: inscripcion.dias_semana });
    } else {
      setComedorFormData({ diasSemana: [] });
    }
    
    setShowComedorModal(true);
  };

  const handleComedorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHijoForComedor || comedorFormData.diasSemana.length === 0) return;

    try {
      // Calcular precio según días
      const diasCount = comedorFormData.diasSemana.length;
      const precioUnitario = getPrecioPorDias(diasCount);

      // Verificar si ya existe una inscripción activa
      const { data: existingInscripcion, error: checkError } = await supabase
        .from('comedor_inscripciones')
        .select('id')
        .eq('hijo_id', selectedHijoForComedor.id)
        .eq('activo', true)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const inscripcionData = {
        hijo_id: selectedHijoForComedor.id,
        dias_semana: comedorFormData.diasSemana,
        precio_diario: precioUnitario,
        activo: true,
        fecha_inicio: new Date().toISOString().split('T')[0],
      };

      if (existingInscripcion) {
        // Actualizar inscripción existente
        const { error } = await supabase
          .from('comedor_inscripciones')
          .update(inscripcionData)
          .eq('id', existingInscripcion.id);
        
        if (error) throw error;
      } else {
        // Crear nueva inscripción
        const { error } = await supabase
          .from('comedor_inscripciones')
          .insert([inscripcionData]);
        
        if (error) throw error;
      }

      setShowComedorModal(false);
      setSelectedHijoForComedor(null);
      setComedorFormData({ diasSemana: [] });
      loadData();
    } catch (error) {
      console.error('Error saving comedor inscription:', error);
    }
  };

  const handleComedorCancel = () => {
    setShowComedorModal(false);
    setSelectedHijoForComedor(null);
    setComedorFormData({ diasSemana: [] });
  };

  const handleDiaComedorToggle = (dia: number) => {
    setComedorFormData(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia].sort()
    }));
  };

  const calcularPrecioComedor = (diasCount: number) => {
    return getPrecioPorDias(diasCount);
  };

  const calcularPrecioSemanal = (diasCount: number) => {
    return diasCount * calcularPrecioComedor(diasCount);
  };

  const calcularPrecioMensual = (diasCount: number) => {
    const precioSemanal = calcularPrecioSemanal(diasCount);
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  const getDiasComedorText = (hijoId: string) => {
    const inscripcion = inscripcionesComedor[hijoId];
    if (!inscripcion) return 'No inscrito';
    
    const diasLabels = ['', 'L', 'M', 'X', 'J', 'V'];
    const diasTexto = inscripcion.dias_semana.map((dia: number) => diasLabels[dia]).join(', ');
    return `${inscripcion.dias_semana.length} días (${diasTexto})`;
  };

  const filteredHijos = hijos.filter(hijo => {
    const matchesSearch = hijo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hijo.padre as any)?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (hijo.grado as any)?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrado = !filterGrado || hijo.grado_id === filterGrado;

    const isInscrito = !!inscripcionesComedor[hijo.id];
    const matchesInscripcion = filterInscripcion === 'all' ||
      (filterInscripcion === 'inscrito' && isInscrito) ||
      (filterInscripcion === 'no-inscrito' && !isInscrito);

    return matchesSearch && matchesGrado && matchesInscripcion;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCheck className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Alumnos</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingHijo(null);
            setFormData({ nombre: '', padre_id: '', grado_id: '', activo: true });
          }}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Alumno</span>
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, padre o grado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="relative">
          <GraduationCap className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filterGrado}
            onChange={(e) => setFilterGrado(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
          >
            <option value="">Todos los cursos</option>
            {grados.map((grado) => (
              <option key={grado.id} value={grado.id}>
                {grado.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Utensils className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filterInscripcion}
            onChange={(e) => setFilterInscripcion(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
          >
            <option value="all">Todos los alumnos</option>
            <option value="inscrito">Inscritos al comedor</option>
            <option value="no-inscrito">No inscritos</option>
          </select>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingHijo ? 'Editar Alumno' : 'Nuevo Alumno'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Padre/Madre</label>
              <select
                value={formData.padre_id}
                onChange={(e) => setFormData(prev => ({ ...prev, padre_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Seleccionar padre...</option>
                {padres.map((padre) => (
                  <option key={padre.id} value={padre.id}>
                    {padre.nombre} ({padre.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
              <select
                value={formData.grado_id}
                onChange={(e) => setFormData(prev => ({ ...prev, grado_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Seleccionar grado...</option>
                {grados.map((grado) => (
                  <option key={grado.id} value={grado.id}>
                    {grado.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingHijo ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingHijo(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de hijos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hijo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Padre/Madre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHijos.map((hijo) => (
                <tr key={hijo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{hijo.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900 truncate">{(hijo.padre as any)?.nombre}</div>
                      <div className="text-sm text-gray-500 truncate" title={(hijo.padre as any)?.email}>{(hijo.padre as any)?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{(hijo.grado as any)?.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-900">{getDiasComedorText(hijo.id)}</div>
                        {inscripcionesComedor[hijo.id] && (
                          <div className="text-xs text-gray-500">
                            {getPrecioPorDias(inscripcionesComedor[hijo.id].dias_semana.length).toFixed(2)}€/día
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleComedorClick(hijo)}
                        className="ml-2 p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                        title={inscripcionesComedor[hijo.id] ? 'Modificar inscripción comedor' : 'Inscribir al comedor'}
                      >
                        <Utensils className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActivo(hijo)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hijo.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {hijo.activo ? (
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
                  <td className="px-6 py-4 text-sm font-medium w-24">
                    <div className="flex space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(hijo)}
                        className="text-green-600 hover:text-green-900 flex-shrink-0"
                        title="Editar hijo"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(hijo)}
                        className="text-red-600 hover:text-red-900 flex-shrink-0"
                        title="Eliminar hijo"
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

      {filteredHijos.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay hijos registrados</h3>
          <p className="text-gray-600">Comienza agregando el primer hijo al sistema</p>
        </div>
      )}

      {/* Modal de inscripción al comedor */}
      {showComedorModal && selectedHijoForComedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <Utensils className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {inscripcionesComedor[selectedHijoForComedor.id] ? 'Modificar inscripción' : 'Inscribir al comedor'}
                </h3>
                <p className="text-sm text-gray-600">{selectedHijoForComedor.nombre}</p>
              </div>
            </div>
            
            <form onSubmit={handleComedorSubmit} className="space-y-4">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Días de la semana</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {diasSemanaOptions.map((dia) => {
                    const isSelected = comedorFormData.diasSemana.includes(dia.value);
                    
                    return (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => handleDiaComedorToggle(dia.value)}
                        className={`
                          relative p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <span className="font-bold text-sm">{dia.short}</span>
                        <span className="text-xs text-center">{dia.label}</span>
                        {isSelected && (
                          <Check className="h-3 w-3 absolute top-1 right-1 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Información de precios */}
              {comedorFormData.diasSemana.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Días seleccionados:</span>
                      <span className="font-semibold text-blue-900">{comedorFormData.diasSemana.length} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Precio por día:</span>
                      <span className="font-semibold text-blue-900">{calcularPrecioComedor(comedorFormData.diasSemana.length).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Precio semanal:</span>
                      <span className="font-semibold text-blue-900">{calcularPrecioSemanal(comedorFormData.diasSemana.length).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1">
                      <span className="text-blue-700 font-medium">Precio mensual aprox:</span>
                      <span className="font-bold text-blue-900">{calcularPrecioMensual(comedorFormData.diasSemana.length).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleComedorCancel}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={comedorFormData.diasSemana.length === 0}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-medium transition-colors
                    ${comedorFormData.diasSemana.length > 0
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }
                  `}
                >
                  {inscripcionesComedor[selectedHijoForComedor.id] ? 'Actualizar' : 'Inscribir'}
                </button>
              </div>
            </form>
          </div>
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
                ¿Estás seguro de que quieres eliminar a este hijo/a?
              </p>
              {hijoToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{hijoToDelete.nombre}</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {(hijoToDelete.grado as any)?.nombre || 'Sin grado'}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {(hijoToDelete.padre as any)?.nombre || 'Sin padre'}
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
                      <p>Al eliminar este hijo también se eliminarán:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Todas las <strong>bajas de comedor</strong></li>
                        <li>Todas las <strong>solicitudes puntuales</strong></li>
                        <li>Todas las <strong>elecciones de menú</strong></li>
                        <li>Todas las <strong>solicitudes de dieta blanda</strong></li>
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