import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Users, AlertCircle, GraduationCap, Briefcase, UserPlus, ChevronDown, ChevronUp, Clock, UserCheck, Ban, RotateCcw } from 'lucide-react';
import { useDailyManagement, DailyDiner } from '../../hooks/useDailyManagement';
import { generateDailyPDF } from '../../utils/dailyPdfExport';
import { supabase } from '../../lib/supabase';

export function DailyManagementView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['recurrentes']));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedComensal, setSelectedComensal] = useState<DailyDiner | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);

  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const { data, loading, error, refetch } = useDailyManagement(formatDateISO(selectedDate));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    setSelectedDate(newDate);
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    generateDailyPDF(data, selectedDate);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const groupByGrado = (comensales: DailyDiner[]) => {
    const grouped = new Map<string, DailyDiner[]>();
    comensales.forEach(c => {
      const grado = c.curso || 'Sin curso';
      if (!grouped.has(grado)) {
        grouped.set(grado, []);
      }
      grouped.get(grado)!.push(c);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const getMenuText = (comensal: DailyDiner): string => {
    if (comensal.tiene_dieta_blanda) return 'Dieta Blanda';
    if (comensal.tiene_menu_personalizado) return 'Menú Personalizado';
    if (comensal.tiene_eleccion) return `${comensal.opcion_principal} + ${comensal.opcion_guarnicion}`;
    return 'Menú Rancho';
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handleCancelClick = (comensal: DailyDiner) => {
    setSelectedComensal(comensal);
    setCancelMotivo('');
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedComensal) return;

    try {
      setProcessingCancel(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const cancelacionData: any = {
        fecha: formatDateISO(selectedDate),
        motivo: cancelMotivo || null,
        cancelado_por: userData.user.id
      };

      if (selectedComensal.hijo_id) {
        cancelacionData.hijo_id = selectedComensal.hijo_id;
      } else if (selectedComensal.padre_id) {
        cancelacionData.padre_id = selectedComensal.padre_id;
      }

      const { error } = await supabase
        .from('comedor_cancelaciones_ultimo_momento')
        .insert([cancelacionData]);

      if (error) throw error;

      setShowCancelModal(false);
      setSelectedComensal(null);
      setCancelMotivo('');
      refetch();
    } catch (error) {
      console.error('Error al cancelar comida:', error);
      alert('Error al cancelar la comida. Por favor, intenta de nuevo.');
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleRestoreClick = async (comensal: DailyDiner) => {
    if (!comensal.cancelacion_id) return;

    if (!confirm(`¿Restaurar la comida de ${comensal.nombre}?`)) return;

    try {
      const { error } = await supabase
        .from('comedor_cancelaciones_ultimo_momento')
        .delete()
        .eq('id', comensal.cancelacion_id);

      if (error) throw error;

      refetch();
    } catch (error) {
      console.error('Error al restaurar comida:', error);
      alert('Error al restaurar la comida. Por favor, intenta de nuevo.');
    }
  };

  const renderComensalesTable = (comensales: DailyDiner[]) => {
    const personal = comensales.filter(c => c.tipo === 'personal' || c.tipo === 'padre');
    const alumnos = comensales.filter(c => c.tipo === 'hijo');
    const externos = comensales.filter(c => c.tipo === 'invitacion');

    return (
      <div className="space-y-4">
        {personal.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup('personal')}
              className="w-full flex items-center justify-between bg-green-50 px-4 py-3 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Personal ({personal.length})</h4>
              </div>
              {expandedGroups.has('personal') ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has('personal') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Menú</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {personal.map((comensal) => (
                      <tr key={comensal.id} className={`hover:bg-gray-50 transition-colors ${comensal.cancelado_ultimo_momento ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${comensal.cancelado_ultimo_momento ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{comensal.nombre}</span>
                            {comensal.cancelado_ultimo_momento && (
                              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">
                                CANCELADO
                              </span>
                            )}
                            {comensal.tiene_dieta_blanda && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">
                                Dieta Blanda
                              </span>
                            )}
                            {comensal.tiene_menu_personalizado && (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">
                                Menú Personalizado
                              </span>
                            )}
                            {comensal.restricciones.length > 0 && (
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                                {comensal.restricciones.join(', ')}
                              </span>
                            )}
                            {comensal.motivo_invitacion && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs italic">
                                {comensal.motivo_invitacion}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getMenuText(comensal)}</td>
                        <td className="px-4 py-3 text-center">
                          {comensal.cancelado_ultimo_momento ? (
                            <button
                              onClick={() => handleRestoreClick(comensal)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                              title="Restaurar comida"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restaurar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelClick(comensal)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                              title="Cancelar comida"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Cancelar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {alumnos.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup('alumnos')}
              className="w-full flex items-center justify-between bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Alumnos ({alumnos.length})</h4>
              </div>
              {expandedGroups.has('alumnos') ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has('alumnos') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Curso</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Menú</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {alumnos.map((comensal) => (
                      <tr key={comensal.id} className={`hover:bg-gray-50 transition-colors ${comensal.cancelado_ultimo_momento ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${comensal.cancelado_ultimo_momento ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{comensal.nombre}</span>
                            {comensal.cancelado_ultimo_momento && (
                              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">
                                CANCELADO
                              </span>
                            )}
                            {comensal.tiene_dieta_blanda && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">
                                Dieta Blanda
                              </span>
                            )}
                            {comensal.tiene_menu_personalizado && (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">
                                Menú Personalizado
                              </span>
                            )}
                            {comensal.restricciones.length > 0 && (
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                                {comensal.restricciones.join(', ')}
                              </span>
                            )}
                            {comensal.motivo_invitacion && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs italic">
                                {comensal.motivo_invitacion}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{comensal.curso || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getMenuText(comensal)}</td>
                        <td className="px-4 py-3 text-center">
                          {comensal.cancelado_ultimo_momento ? (
                            <button
                              onClick={() => handleRestoreClick(comensal)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                              title="Restaurar comida"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restaurar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelClick(comensal)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                              title="Cancelar comida"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Cancelar</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {externos.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup('externos')}
              className="w-full flex items-center justify-between bg-purple-50 px-4 py-3 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Invitados Externos ({externos.length})</h4>
              </div>
              {expandedGroups.has('externos') ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has('externos') && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Menú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {externos.map((comensal) => (
                      <tr key={comensal.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{comensal.nombre}</span>
                            {comensal.motivo_invitacion && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs italic">
                                {comensal.motivo_invitacion}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getMenuText(comensal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Parte Diario del Comedor</h1>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={!data || loading}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <Download className="h-5 w-5" />
          <span>Descargar PDF</span>
        </button>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={goToTomorrow}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mañana
              </button>
            </div>
            <input
              type="date"
              value={formatDateISO(selectedDate)}
              onChange={handleDateChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-900 capitalize">{formatDate(selectedDate)}</p>
            {isWeekend(selectedDate) && (
              <div className="flex items-center space-x-2 mt-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  Fin de semana - No hay servicio de comedor
                </span>
              </div>
            )}
            {data?.es_festivo && (
              <div className="flex items-center space-x-2 mt-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  Día festivo: {data.nombre_festivo}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-600">Cargando datos del día...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error al cargar los datos: {error}</span>
          </div>
        </div>
      )}

      {!loading && data && !isWeekend(selectedDate) && (
        <>
          {/* Listado Completo */}
          <div className="space-y-6">
            {/* Comensales Recurrentes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => toggleSection('recurrentes')}
                className="w-full flex items-center justify-between mb-4 group"
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Comensales Recurrentes ({data.comensales_recurrentes.length})
                  </h2>
                </div>
                {expandedSections.has('recurrentes') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                )}
              </button>

              {expandedSections.has('recurrentes') && (
                <div className="mt-4">
                  {data.comensales_recurrentes.length > 0 ? (
                    renderComensalesTable(data.comensales_recurrentes)
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No hay comensales recurrentes para este día</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comensales Puntuales */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => toggleSection('puntuales')}
                className="w-full flex items-center justify-between mb-4 group"
              >
                <div className="flex items-center space-x-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Comensales Puntuales ({data.comensales_puntuales.length})
                  </h2>
                </div>
                {expandedSections.has('puntuales') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                )}
              </button>

              {expandedSections.has('puntuales') && (
                <div className="mt-4">
                  {data.comensales_puntuales.length > 0 ? (
                    renderComensalesTable(data.comensales_puntuales)
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No hay comensales puntuales para este día</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !data && !isWeekend(selectedDate) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-600">No se encontraron datos para esta fecha</p>
        </div>
      )}

      {/* Modal de cancelación */}
      {showCancelModal && selectedComensal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Cancelar Comida
                </h3>
                <p className="text-sm text-gray-600">{selectedComensal.nombre}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                Esta acción cancelará la comida para <strong>{formatDate(selectedDate)}</strong> y no será facturada.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de cancelación (opcional)
              </label>
              <textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ej: Aviso de última hora, enfermedad..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedComensal(null);
                  setCancelMotivo('');
                }}
                disabled={processingCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={processingCancel}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {processingCancel ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
