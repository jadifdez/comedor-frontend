import React, { useState, useEffect } from 'react';
import { supabase, DiaFestivo } from '../../lib/supabase';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle, X, Check, Search } from 'lucide-react';

interface DayInfo {
  day: number;
  isCurrentMonth: boolean;
  date: string;
  festivo?: DiaFestivo;
}

export function DiasFestivosManager() {
  const [diasFestivos, setDiasFestivos] = useState<DiaFestivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [diaToDelete, setDiaToDelete] = useState<DiaFestivo | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPeriodo, setIsPeriodo] = useState(false);
  const [formData, setFormData] = useState({
    fechaInicio: '',
    fechaFin: '',
    nombre: '',
    activo: true
  });

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  useEffect(() => {
    loadDiasFestivos();
  }, [selectedYear]);

  const loadDiasFestivos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dias_festivos')
        .select('*')
        .gte('fecha', `${selectedYear}-01-01`)
        .lte('fecha', `${selectedYear}-12-31`)
        .order('fecha', { ascending: true });

      if (error) throw error;
      setDiasFestivos(data || []);
    } catch (error) {
      console.error('Error loading días festivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number): DayInfo[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: DayInfo[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        day,
        isCurrentMonth: false,
        date: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const festivo = diasFestivos.find(f => f.fecha === dateStr);
      days.push({
        day,
        isCurrentMonth: true,
        date: dateStr,
        festivo
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        day,
        isCurrentMonth: false,
        date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }

    return days;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isPeriodo && formData.fechaInicio && formData.fechaFin) {
        const fechas = [];
        const inicio = new Date(formData.fechaInicio + 'T00:00:00');
        const fin = new Date(formData.fechaFin + 'T00:00:00');

        let currentDate = new Date(inicio);
        while (currentDate <= fin) {
          fechas.push({
            fecha: currentDate.toISOString().split('T')[0],
            nombre: formData.nombre,
            activo: formData.activo
          });
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (fechas.length === 0) {
          throw new Error('No se generaron fechas. Verifica que la fecha de inicio sea anterior a la fecha de fin.');
        }

        const { error } = await supabase
          .from('dias_festivos')
          .insert(fechas);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dias_festivos')
          .insert([{
            fecha: formData.fechaInicio,
            nombre: formData.nombre,
            activo: formData.activo
          }]);

        if (error) throw error;
      }

      setFormData({ fechaInicio: '', fechaFin: '', nombre: '', activo: true });
      setIsPeriodo(false);
      setShowModal(false);
      setError(null);
      loadDiasFestivos();
    } catch (error: any) {
      console.error('Error saving día festivo:', error);
      setError(error.message || 'Error al guardar el día festivo. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteClick = (festivo: DiaFestivo) => {
    setDiaToDelete(festivo);
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

  const toggleActivo = async (festivo: DiaFestivo) => {
    try {
      const { error } = await supabase
        .from('dias_festivos')
        .update({ activo: !festivo.activo })
        .eq('id', festivo.id);

      if (error) throw error;
      loadDiasFestivos();
    } catch (error) {
      console.error('Error updating día festivo status:', error);
    }
  };

  const handleDayClick = (date: string, festivo?: DiaFestivo) => {
    if (festivo) {
      // Show edit options for existing holiday
      return;
    } else {
      // Quick add new holiday
      setFormData({ fechaInicio: date, fechaFin: date, nombre: '', activo: true });
      setIsPeriodo(false);
      setShowModal(true);
    }
  };

  const filteredFestivos = diasFestivos.filter(f =>
    f.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const festivosByMonth = months.map((_, monthIndex) => {
    return diasFestivos.filter(f => {
      const festivoMonth = parseInt(f.fecha.split('-')[1]) - 1;
      return festivoMonth === monthIndex;
    });
  });

  const totalFestivos = diasFestivos.filter(f => f.activo).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Días Festivos {selectedYear}</h2>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setIsPeriodo(false);
              setFormData({ fechaInicio: '', fechaFin: '', nombre: '', activo: true });
            }}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Día Festivo</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Year Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedYear(selectedYear - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-900 min-w-[80px] text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(selectedYear + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar días festivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="px-3 py-1 bg-red-50 text-red-700 rounded-lg font-medium">
              {totalFestivos} días festivos activos
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-700">Festivo Activo</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-gray-700">Festivo Inactivo</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
            <span className="text-gray-700">Fin de semana</span>
          </div>
        </div>
      </div>

      {/* Year Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((monthName, monthIndex) => {
          const days = getDaysInMonth(selectedYear, monthIndex);
          const monthFestivos = festivosByMonth[monthIndex];
          const isHighlighted = searchTerm && monthFestivos.some(f =>
            f.nombre.toLowerCase().includes(searchTerm.toLowerCase())
          );

          return (
            <div
              key={monthIndex}
              className={`bg-white rounded-lg shadow-sm border ${
                isHighlighted ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'
              } p-4 transition-all`}
            >
              {/* Month Header */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{monthName}</h3>
                {monthFestivos.length > 0 && (
                  <p className="text-xs text-red-600">
                    {monthFestivos.filter(f => f.activo).length} días festivos
                  </p>
                )}
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((dayName) => (
                  <div
                    key={dayName}
                    className="text-xs font-medium text-gray-500 text-center"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((dayInfo, idx) => {
                  const isWeekend = idx % 7 >= 5;
                  const isFestivo = !!dayInfo.festivo;
                  const isActive = dayInfo.festivo?.activo;
                  const isHovered = hoveredDay === dayInfo.date;
                  const isSearchMatch = searchTerm && dayInfo.festivo &&
                    dayInfo.festivo.nombre.toLowerCase().includes(searchTerm.toLowerCase());

                  return (
                    <div
                      key={idx}
                      onClick={() => dayInfo.isCurrentMonth && handleDayClick(dayInfo.date, dayInfo.festivo)}
                      onMouseEnter={() => dayInfo.festivo && setHoveredDay(dayInfo.date)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`
                        relative aspect-square flex items-center justify-center text-xs rounded
                        ${!dayInfo.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                        ${isFestivo && isActive ? 'bg-red-100 border border-red-300 font-semibold text-red-700' : ''}
                        ${isFestivo && !isActive ? 'bg-gray-100 border border-gray-300 text-gray-500 line-through' : ''}
                        ${!isFestivo && isWeekend && dayInfo.isCurrentMonth ? 'bg-blue-50' : ''}
                        ${!isFestivo && dayInfo.isCurrentMonth ? 'hover:bg-gray-100 cursor-pointer' : ''}
                        ${isFestivo ? 'cursor-pointer' : ''}
                        ${isSearchMatch ? 'ring-2 ring-red-400' : ''}
                        transition-all
                      `}
                      title={dayInfo.festivo ? dayInfo.festivo.nombre : ''}
                    >
                      <span className="z-10">{dayInfo.day}</span>

                      {/* Hover Tooltip */}
                      {isHovered && dayInfo.festivo && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
                            <div className="font-medium mb-1">{dayInfo.festivo.nombre}</div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleActivo(dayInfo.festivo!);
                                }}
                                className="text-xs px-2 py-0.5 bg-white text-gray-900 rounded hover:bg-gray-100"
                              >
                                {dayInfo.festivo.activo ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(dayInfo.festivo!);
                                }}
                                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating/Editing */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Nuevo Día Festivo
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Single Day or Period Toggle */}
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

              {/* Date Inputs */}
              <div className="space-y-3">
                {!isPeriodo ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
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
                    {formData.fechaInicio && formData.fechaFin && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          Se crearán {Math.ceil((new Date(formData.fechaFin).getTime() - new Date(formData.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1} días festivos
                        </p>
                      </div>
                    )}
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

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
                    {new Date(diaToDelete.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
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
                onClick={() => setShowDeleteModal(false)}
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
