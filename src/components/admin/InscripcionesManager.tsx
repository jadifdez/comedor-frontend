import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, User, Users, X, Check, Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SearchableSelect } from '../SearchableSelect';
import { exportarInscripcionesAExcel, exportarParteDiarioMensual } from '../../utils/excelExport';

interface Hijo {
  id: string;
  nombre: string;
  grado: { nombre: string } | null;
}

interface Padre {
  id: string;
  nombre: string;
  es_personal: boolean;
  exento_facturacion: boolean;
}

interface InscripcionAlumno {
  id: string;
  hijo_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  hijo_details: Hijo;
  descuento_aplicado: number;
}

interface InscripcionPadre {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  padre: Padre;
}

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }
];

export default function InscripcionesManager() {
  const [activeTab, setActiveTab] = useState<'alumnos' | 'personal'>('alumnos');
  const [inscripcionesAlumnos, setInscripcionesAlumnos] = useState<InscripcionAlumno[]>([]);
  const [inscripcionesPadres, setInscripcionesPadres] = useState<InscripcionPadre[]>([]);
  const [todosAlumnos, setTodosAlumnos] = useState<Hijo[]>([]);
  const [todosPadres, setTodosPadres] = useState<Padre[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [exportando, setExportando] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [formData, setFormData] = useState({
    persona_id: '',
    dias_semana: [] as number[],
    activo: true,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: ''
  });

  const fetchInscripcionesAlumnos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comedor_inscripciones')
      .select(`
        *,
        hijo_details:hijos(
          id,
          nombre,
          grado:grados(nombre)
        )
      `)
      .order('activo', { ascending: false });

    if (error) {
      setErrorMessage('Error al cargar inscripciones de alumnos');
      console.error(error);
    } else {
      // Ordenar por nombre del hijo en el cliente
      const sortedData = (data || []).sort((a, b) => {
        const nombreA = a.hijo_details?.nombre || '';
        const nombreB = b.hijo_details?.nombre || '';
        return nombreA.localeCompare(nombreB);
      });
      setInscripcionesAlumnos(sortedData);
    }
    setLoading(false);
  };

  const fetchInscripcionesPadres = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comedor_inscripciones_padres')
      .select(`
        *,
        padre:padres(
          id,
          nombre,
          es_personal,
          exento_facturacion
        )
      `)
      .order('activo', { ascending: false });

    if (error) {
      setErrorMessage('Error al cargar inscripciones de personal');
      console.error(error);
    } else {
      // Ordenar por nombre del padre en el cliente
      const sortedData = (data || []).sort((a, b) => {
        const nombreA = a.padre?.nombre || '';
        const nombreB = b.padre?.nombre || '';
        return nombreA.localeCompare(nombreB);
      });
      setInscripcionesPadres(sortedData);
    }
    setLoading(false);
  };

  const fetchTodosAlumnos = async () => {
    const { data, error } = await supabase
      .from('hijos')
      .select('id, nombre, grado:grados(nombre)')
      .eq('activo', true)
      .order('nombre');

    if (!error && data) {
      setTodosAlumnos(data);
    }
  };

  const fetchTodosPadres = async () => {
    const { data, error } = await supabase
      .from('padres')
      .select('id, nombre, es_personal')
      .eq('es_personal', true)
      .eq('activo', true)
      .order('nombre');

    if (!error && data) {
      setTodosPadres(data);
    }
  };

  useEffect(() => {
    fetchInscripcionesAlumnos();
    fetchInscripcionesPadres();
    fetchTodosAlumnos();
    fetchTodosPadres();
  }, []);

  // Filtrar padres que NO tienen una inscripción activa
  const padresDisponibles = todosPadres.filter(padre => {
    // Si estamos editando, permitir el padre actual
    if (editingId && activeTab === 'personal') {
      const inscripcionActual = inscripcionesPadres.find(i => i.id === editingId);
      if (inscripcionActual && inscripcionActual.padre_id === padre.id) {
        return true;
      }
    }
    // Verificar si el padre ya tiene una inscripción activa
    return !inscripcionesPadres.some(i => i.padre_id === padre.id && i.activo);
  });

  const resetForm = () => {
    setFormData({
      persona_id: '',
      dias_semana: [],
      activo: true,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (inscripcion: InscripcionAlumno | InscripcionPadre) => {
    const persona_id = 'hijo_id' in inscripcion ? inscripcion.hijo_id : inscripcion.padre_id;

    setFormData({
      persona_id,
      dias_semana: inscripcion.dias_semana,
      activo: inscripcion.activo,
      fecha_inicio: inscripcion.fecha_inicio,
      fecha_fin: inscripcion.fecha_fin || ''
    });
    setEditingId(inscripcion.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta inscripción?')) return;

    const table = activeTab === 'alumnos' ? 'comedor_inscripciones' : 'comedor_inscripciones_padres';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      setErrorMessage('Error al eliminar la inscripción');
      console.error(error);
    } else {
      setSuccessMessage('Inscripción eliminada correctamente');
      if (activeTab === 'alumnos') {
        fetchInscripcionesAlumnos();
      } else {
        fetchInscripcionesPadres();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.persona_id || formData.dias_semana.length === 0) {
      setErrorMessage('Por favor completa todos los campos obligatorios');
      return;
    }

    // El precio_diario se calculará automáticamente mediante triggers en la base de datos
    const inscripcionData = {
      dias_semana: formData.dias_semana,
      activo: formData.activo,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin || null
    };

    if (activeTab === 'alumnos') {
      const data = { ...inscripcionData, hijo_id: formData.persona_id };

      if (editingId) {
        const { error } = await supabase
          .from('comedor_inscripciones')
          .update(data)
          .eq('id', editingId);

        if (error) {
          setErrorMessage('Error al actualizar la inscripción');
          console.error(error);
        } else {
          setSuccessMessage('Inscripción actualizada correctamente');
          resetForm();
          fetchInscripcionesAlumnos();
        }
      } else {
        const { error } = await supabase
          .from('comedor_inscripciones')
          .insert(data);

        if (error) {
          setErrorMessage('Error al crear la inscripción');
          console.error(error);
        } else {
          setSuccessMessage('Inscripción creada correctamente');
          resetForm();
          fetchInscripcionesAlumnos();
        }
      }
    } else {
      const data = { ...inscripcionData, padre_id: formData.persona_id };

      if (editingId) {
        const { error } = await supabase
          .from('comedor_inscripciones_padres')
          .update(data)
          .eq('id', editingId);

        if (error) {
          setErrorMessage('Error al actualizar la inscripción');
          console.error(error);
        } else {
          setSuccessMessage('Inscripción actualizada correctamente');
          resetForm();
          fetchInscripcionesPadres();
        }
      } else {
        const { error } = await supabase
          .from('comedor_inscripciones_padres')
          .insert(data);

        if (error) {
          setErrorMessage('Error al crear la inscripción');
          console.error(error);
        } else {
          setSuccessMessage('Inscripción creada correctamente');
          resetForm();
          fetchInscripcionesPadres();
        }
      }
    }
  };

  const toggleDia = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia].sort()
    }));
  };

  const getDiasText = (dias: number[]) => {
    return dias
      .map(d => DIAS_SEMANA.find(ds => ds.value === d)?.label)
      .filter(Boolean)
      .join(', ');
  };

  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      setErrorMessage('');

      const { data: alumnosData, error: errorAlumnos } = await supabase
        .from('comedor_inscripciones')
        .select(`
          *,
          hijo_details:hijos(
            nombre,
            grado:grados(nombre)
          )
        `);

      if (errorAlumnos) throw errorAlumnos;

      const { data: padresData, error: errorPadres } = await supabase
        .from('comedor_inscripciones_padres')
        .select(`
          *,
          padre:padres(
            nombre,
            exento_facturacion
          )
        `);

      if (errorPadres) throw errorPadres;

      const resultado = exportarInscripcionesAExcel({
        inscripcionesAlumnos: alumnosData || [],
        inscripcionesPadres: padresData || []
      });

      setSuccessMessage(`Excel exportado correctamente: ${resultado.nombreArchivo} (${resultado.totalInscripciones} inscripciones)`);
    } catch (error: any) {
      console.error('Error al exportar:', error);
      setErrorMessage('Error al exportar las inscripciones a Excel');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarParteDiario = async () => {
    if (!mesSeleccionado) {
      setErrorMessage('Por favor, selecciona un mes');
      return;
    }

    try {
      setExportando(true);
      setErrorMessage('');
      setSuccessMessage('');

      await exportarParteDiarioMensual(mesSeleccionado);

      setSuccessMessage('Parte diario exportado correctamente');
    } catch (error: any) {
      console.error('Error al exportar parte diario:', error);
      setErrorMessage('Error al exportar el parte diario');
    } finally {
      setExportando(false);
    }
  };

  const DiasSemanaIndicator = ({ diasSeleccionados }: { diasSeleccionados: number[] }) => {
    const diasAbreviados = [
      { value: 1, label: 'L' },
      { value: 2, label: 'M' },
      { value: 3, label: 'X' },
      { value: 4, label: 'J' },
      { value: 5, label: 'V' }
    ];

    return (
      <div className="flex gap-1">
        {diasAbreviados.map(dia => {
          const isSelected = diasSeleccionados.includes(dia.value);
          return (
            <div
              key={dia.value}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
              title={DIAS_SEMANA.find(d => d.value === dia.value)?.label}
            >
              {dia.label}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Inscripciones</h2>
          <p className="text-gray-600">Administra las inscripciones al comedor de alumnos y personal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportarExcel}
            disabled={exportando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {exportando ? 'Exportando...' : 'Exportar a Excel'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nueva Inscripción
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">Parte Diario Mensual:</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Selecciona mes:</label>
            <input
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleExportarParteDiario}
              disabled={exportando || !mesSeleccionado}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Exportar parte diario con columnas por día del mes, organizado por grados"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exportando ? 'Exportando...' : 'Exportar Parte Diario'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2 ml-7">
          Genera un Excel con una hoja por grado/clase. Incluye alumnos con sus alergias, inscripciones, y columnas para cada día del mes (X=Inscrito, C=Cancelado, P=Puntual, I=Invitado)
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('alumnos')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'alumnos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-5 h-5" />
          Alumnos ({inscripcionesAlumnos.length})
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'personal'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-5 h-5" />
          Personal ({inscripcionesPadres.length})
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Editar Inscripción' : 'Nueva Inscripción'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  {editingId ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {activeTab === 'alumnos' ? 'Alumno' : 'Personal'} *
                      </label>
                      <input
                        type="text"
                        value={
                          activeTab === 'alumnos'
                            ? todosAlumnos.find(h => h.id === formData.persona_id)?.nombre || ''
                            : todosPadres.find(p => p.id === formData.persona_id)?.nombre || ''
                        }
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      />
                    </>
                  ) : (
                    <SearchableSelect
                      label={activeTab === 'alumnos' ? 'Alumno' : 'Personal'}
                      options={
                        activeTab === 'alumnos'
                          ? todosAlumnos.map(h => ({
                              value: h.id,
                              label: `${h.nombre} - ${h.grado?.nombre || 'Sin grado'}`
                            }))
                          : padresDisponibles.map(p => ({
                              value: p.id,
                              label: p.nombre
                            }))
                      }
                      value={formData.persona_id}
                      onChange={(value) => setFormData({ ...formData, persona_id: value })}
                      placeholder={`Buscar ${activeTab === 'alumnos' ? 'alumno' : 'personal'}...`}
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de la semana *
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {DIAS_SEMANA.map(dia => (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => toggleDia(dia.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.dias_semana.includes(dia.value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {dia.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.activo ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Activa</option>
                      <option value="false">Inactiva</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">El precio se calcula automáticamente según descuentos aplicables</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Fin (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingId ? 'Actualizar' : 'Crear'} Inscripción
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando inscripciones...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'alumnos' ? 'Alumno' : 'Personal'}
                  </th>
                  {activeTab === 'alumnos' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grado
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Diario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === 'alumnos' ? (
                  inscripcionesAlumnos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No hay inscripciones de alumnos
                      </td>
                    </tr>
                  ) : (
                    inscripcionesAlumnos.map((insc) => (
                      <tr key={insc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {insc.hijo_details?.nombre}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {insc.hijo_details?.grado?.nombre || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <DiasSemanaIndicator diasSeleccionados={insc.dias_semana} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {insc.precio_diario.toFixed(2)} €
                            {insc.descuento_aplicado > 0 && (
                              <span className="text-xs text-green-600 ml-1">
                                (-{insc.descuento_aplicado.toFixed(2)}€)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(insc.fecha_inicio).toLocaleDateString('es-ES')}
                            {insc.fecha_fin && ` - ${new Date(insc.fecha_fin).toLocaleDateString('es-ES')}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            insc.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {insc.activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {insc.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(insc)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(insc.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  inscripcionesPadres.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No hay inscripciones de personal
                      </td>
                    </tr>
                  ) : (
                    inscripcionesPadres.map((insc) => (
                      <tr key={insc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {insc.padre?.nombre}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <DiasSemanaIndicator diasSeleccionados={insc.dias_semana} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {insc.padre?.exento_facturacion ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Exento
                            </span>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {insc.precio_diario.toFixed(2)} €
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(insc.fecha_inicio).toLocaleDateString('es-ES')}
                            {insc.fecha_fin && ` - ${new Date(insc.fecha_fin).toLocaleDateString('es-ES')}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            insc.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {insc.activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {insc.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(insc)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(insc.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
