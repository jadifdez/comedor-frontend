import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  UserPlus,
  Trash2,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  TrendingUp,
  CalendarDays,
  List,
  BarChart3,
  X
} from 'lucide-react';
import { useInvitaciones, type InvitacionFormData } from '../../hooks/useInvitaciones';
import { supabase } from '../../lib/supabase';
import { SuccessMessage } from '../SuccessMessage';
import { SearchableSelect } from '../SearchableSelect';
import { ConfirmModal } from '../ConfirmModal';

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

interface MonthGroup {
  month: string;
  year: number;
  invitaciones: typeof invitaciones[0][];
  isExpanded: boolean;
}

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }
];

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100, 200];

type ViewMode = 'list' | 'calendar' | 'stats';

export const InvitacionesManager: React.FC = () => {
  const { invitaciones, loading, error, createInvitacion, deleteInvitacion } = useInvitaciones();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invitacionToDelete, setInvitacionToDelete] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'hijo' | 'padre' | 'externo'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Month grouping
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<InvitacionFormData>({
    fechas: [],
    tipo_invitado: 'hijo',
    motivo: '',
    es_recurrente: false
  });

  const [singleFecha, setSingleFecha] = useState('');
  const [recurrenteConfig, setRecurrenteConfig] = useState({
    dias_semana: [] as number[],
    fecha_inicio: '',
    fecha_fin: ''
  });

  useEffect(() => {
    fetchHijos();
    fetchPadres();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalFormData = { ...formData };

    if (formData.es_recurrente) {
      if (recurrenteConfig.dias_semana.length === 0) {
        setSuccessMessage('');
        alert('Debe seleccionar al menos un día de la semana');
        return;
      }
      finalFormData = {
        ...formData,
        ...recurrenteConfig
      };
    } else {
      finalFormData.fechas = [singleFecha];
    }

    const result = await createInvitacion(finalFormData);

    if (result.success) {
      setSuccessMessage('Invitación(es) creada(s) correctamente');
      setShowForm(false);
      resetForm();
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      fechas: [],
      tipo_invitado: 'hijo',
      motivo: '',
      es_recurrente: false
    });
    setSingleFecha('');
    setRecurrenteConfig({
      dias_semana: [],
      fecha_inicio: '',
      fecha_fin: ''
    });
  };

  const handleDeleteClick = (id: string) => {
    setInvitacionToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invitacionToDelete) return;

    const result = await deleteInvitacion(invitacionToDelete);
    if (result.success) {
      setSuccessMessage('Invitación eliminada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setInvitacionToDelete(null);
  };

  const getInvitadoDisplay = (inv: typeof invitaciones[0]) => {
    if (inv.hijo) return `${inv.hijo.nombre} (${inv.hijo.grado.nombre})`;
    if (inv.padre) return `${inv.padre.nombre} ${inv.padre.es_personal ? '(Personal)' : ''}`;
    return inv.nombre_completo || 'Desconocido';
  };

  const getTipoInvitado = (inv: typeof invitaciones[0]) => {
    if (inv.hijo_id) return 'hijo';
    if (inv.padre_id) return 'padre';
    return 'externo';
  };

  // Filter and search invitations
  const filteredInvitaciones = useMemo(() => {
    let filtered = [...invitaciones];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => {
        const invitado = getInvitadoDisplay(inv).toLowerCase();
        const motivo = inv.motivo.toLowerCase();
        const fecha = new Date(inv.fecha).toLocaleDateString('es-ES');
        return invitado.includes(term) || motivo.includes(term) || fecha.includes(term);
      });
    }

    // Type filter
    if (filterTipo !== 'all') {
      filtered = filtered.filter(inv => getTipoInvitado(inv) === filterTipo);
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(inv => inv.fecha >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter(inv => inv.fecha <= filterDateTo);
    }

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.fecha);
        const monthYear = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
        return monthYear === selectedMonth;
      });
    }

    return filtered;
  }, [invitaciones, searchTerm, filterTipo, filterDateFrom, filterDateTo, selectedMonth]);

  // Group by month
  const monthGroups = useMemo(() => {
    const groups: { [key: string]: MonthGroup } = {};

    filteredInvitaciones.forEach(inv => {
      const date = new Date(inv.fecha);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          invitaciones: [],
          isExpanded: expandedMonths.has(monthKey)
        };
      }

      groups[monthKey].invitaciones.push(inv);
    });

    return Object.entries(groups)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredInvitaciones, expandedMonths]);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futuras = filteredInvitaciones.filter(inv => new Date(inv.fecha) >= today).length;
    const pasadas = filteredInvitaciones.filter(inv => new Date(inv.fecha) < today).length;

    const porTipo = {
      hijos: filteredInvitaciones.filter(inv => inv.hijo_id).length,
      padres: filteredInvitaciones.filter(inv => inv.padre_id).length,
      externos: filteredInvitaciones.filter(inv => inv.nombre_completo).length
    };

    const topInvitados: { [key: string]: number } = {};
    filteredInvitaciones.forEach(inv => {
      const nombre = getInvitadoDisplay(inv);
      topInvitados[nombre] = (topInvitados[nombre] || 0) + 1;
    });

    const topInvitadosArray = Object.entries(topInvitados)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total: filteredInvitaciones.length,
      futuras,
      pasadas,
      porTipo,
      topInvitados: topInvitadosArray
    };
  }, [filteredInvitaciones]);

  // Pagination
  const paginatedInvitaciones = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredInvitaciones.slice(startIndex, endIndex);
  }, [filteredInvitaciones, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInvitaciones.length / itemsPerPage);

  // Get unique months for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    invitaciones.forEach(inv => {
      const date = new Date(inv.fecha);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [invitaciones]);

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipo('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSelectedMonth('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || filterTipo !== 'all' || filterDateFrom || filterDateTo || selectedMonth;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Cargando invitaciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Invitaciones</h2>
          <p className="text-sm text-gray-500 mt-1">
            Total: {invitaciones.length} invitaciones | Mostrando: {filteredInvitaciones.length}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          {showForm ? 'Cancelar' : 'Nueva Invitación'}
        </button>
      </div>

      {successMessage && <SuccessMessage message={successMessage} />}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Invitado
                </label>
                <select
                  value={formData.tipo_invitado}
                  onChange={(e) => setFormData({ ...formData, tipo_invitado: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="hijo">Alumno</option>
                  <option value="padre">Personal/Profesor</option>
                  <option value="externo">Persona Externa</option>
                </select>
              </div>

              {formData.tipo_invitado === 'hijo' && (
                <SearchableSelect
                  label="Seleccionar Alumno"
                  options={hijos.map(hijo => ({
                    value: hijo.id,
                    label: `${hijo.nombre} - ${hijo.grado.nombre} (Padre: ${hijo.padre.nombre})`
                  }))}
                  value={formData.hijo_id || ''}
                  onChange={(value) => setFormData({ ...formData, hijo_id: value })}
                  placeholder="Busque y seleccione un alumno"
                  required
                />
              )}

              {formData.tipo_invitado === 'padre' && (
                <SearchableSelect
                  label="Seleccionar Personal/Profesor"
                  options={padres.map(padre => ({
                    value: padre.id,
                    label: padre.nombre
                  }))}
                  value={formData.padre_id || ''}
                  onChange={(value) => setFormData({ ...formData, padre_id: value })}
                  placeholder="Busque y seleccione personal"
                  required
                />
              )}

              {formData.tipo_invitado === 'externo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_completo || ''}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre de la persona externa"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={formData.es_recurrente}
                  onChange={(e) => setFormData({ ...formData, es_recurrente: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Invitación Recurrente
              </label>
            </div>

            {!formData.es_recurrente ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de la Invitación
                </label>
                <input
                  type="date"
                  value={singleFecha}
                  onChange={(e) => setSingleFecha(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Días de la Semana
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {DIAS_SEMANA.map((dia) => (
                      <label
                        key={dia.value}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={recurrenteConfig.dias_semana.includes(dia.value)}
                          onChange={(e) => {
                            const newDias = e.target.checked
                              ? [...recurrenteConfig.dias_semana, dia.value]
                              : recurrenteConfig.dias_semana.filter(d => d !== dia.value);
                            setRecurrenteConfig({ ...recurrenteConfig, dias_semana: newDias });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{dia.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={recurrenteConfig.fecha_inicio}
                      onChange={(e) => setRecurrenteConfig({ ...recurrenteConfig, fecha_inicio: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      value={recurrenteConfig.fecha_fin}
                      onChange={(e) => setRecurrenteConfig({ ...recurrenteConfig, fecha_fin: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la Invitación
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Ej: Premio escolar, evento especial, reunión..."
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Invitación
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Mode Selector */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            viewMode === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4" />
          <span className="font-medium">Lista</span>
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            viewMode === 'calendar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span className="font-medium">Por Mes</span>
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
            viewMode === 'stats'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="font-medium">Estadísticas</span>
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Nombre, motivo o fecha..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Invitado
              </label>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos</option>
                <option value="hijo">Alumnos</option>
                <option value="padre">Personal</option>
                <option value="externo">Externos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los meses</option>
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                  return (
                    <option key={month} value={month}>
                      {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde - Hasta
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics View */}
      {viewMode === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Futuras</p>
                  <p className="text-3xl font-bold text-green-600">{stats.futuras}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pasadas</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.pasadas}</p>
                </div>
                <Calendar className="w-10 h-10 text-gray-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Por Mes</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {(stats.total / monthGroups.length || 0).toFixed(0)}
                  </p>
                </div>
                <CalendarDays className="w-10 h-10 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Tipo</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Alumnos</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.porTipo.hijos}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Personal</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.porTipo.padres}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Externos</span>
                  <span className="text-lg font-semibold text-gray-900">{stats.porTipo.externos}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Invitados</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.topInvitados.map(([nombre, count], index) => (
                  <div key={nombre} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 truncate flex-1">
                      {index + 1}. {nombre}
                    </span>
                    <span className="font-semibold text-gray-900 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar/Month View */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {monthGroups.map(group => (
            <div key={group.key} className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => toggleMonth(group.key)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {group.month}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {group.invitaciones.length} invitaciones
                  </span>
                </div>
                {group.isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {group.isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invitado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Motivo
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.invitaciones.map((invitacion) => (
                          <tr key={invitacion.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {new Date(invitacion.fecha).toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {getInvitadoDisplay(invitacion)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {invitacion.motivo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteClick(invitacion.id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Eliminar invitación"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {monthGroups.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">No hay invitaciones que coincidan con los filtros</p>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInvitaciones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No hay invitaciones que coincidan con los filtros</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedInvitaciones.map((invitacion) => (
                      <tr key={invitacion.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(invitacion.fecha).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getInvitadoDisplay(invitacion)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {invitacion.motivo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invitacion.created_at).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteClick(invitacion.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Eliminar invitación"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredInvitaciones.length)} de {filteredInvitaciones.length}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option} por página
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Primera
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-4 py-1 text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Última
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Invitación"
        message="¿Estás seguro de que quieres eliminar esta invitación? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
