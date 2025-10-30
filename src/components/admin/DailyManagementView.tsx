import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Users, AlertCircle, Utensils, Heart, Gift, XCircle, GraduationCap, Briefcase, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useDailyManagement, DailyDiner } from '../../hooks/useDailyManagement';
import { generateDailyPDF } from '../../utils/dailyPdfExport';

export function DailyManagementView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['alumnos', 'dietas']));

  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const { data, loading, error } = useDailyManagement(formatDateISO(selectedDate));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Gestión Diaria del Comedor</h1>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={!data || loading}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
        >
          <Download className="h-5 w-5" />
          <span>Descargar Parte Diario PDF</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Seleccionar Fecha</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={goToTomorrow}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Mañana
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="flex-1">
              <input
                type="date"
                value={formatDateISO(selectedDate)}
                onChange={handleDateChange}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comensales</p>
                  <p className="text-3xl font-bold text-gray-900">{data.total_neto}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.total_inscritos} inscritos + {data.total_invitaciones} invitados
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Utensils className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Menús Elegidos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.comensales.filter(c => c.tiene_eleccion).length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.menu_rancho.length} Rancho (por defecto)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Heart className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dietas Blandas</p>
                  <p className="text-3xl font-bold text-gray-900">{data.dietas_blandas.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bajas</p>
                  <p className="text-3xl font-bold text-gray-900">{data.total_bajas}</p>
                </div>
              </div>
            </div>
          </div>

          {data.bajas.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl shadow-sm border-2 border-red-300 p-6">
              <button
                onClick={() => toggleSection('bajas')}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center space-x-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Bajas del Día ({data.bajas.length})
                  </h2>
                </div>
                {expandedSections.has('bajas') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {expandedSections.has('bajas') && (
                <div className="space-y-2">
                  {data.bajas.map((baja) => (
                    <div key={baja.id} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{baja.nombre}</p>
                          {baja.curso && (
                            <p className="text-sm text-gray-600">{baja.curso}</p>
                          )}
                        </div>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          {baja.tipo === 'hijo' ? 'Alumno' : 'Personal'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {data.dietas_blandas.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border-2 border-amber-300 p-6">
              <button
                onClick={() => toggleSection('dietas')}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center space-x-3">
                  <Heart className="h-6 w-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Dietas Blandas - Preparación Especial ({data.dietas_blandas.length})
                  </h2>
                </div>
                {expandedSections.has('dietas') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {expandedSections.has('dietas') && (
                <div className="space-y-2">
                  {data.dietas_blandas.map((dieta) => (
                    <div key={dieta.id} className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{dieta.nombre}</p>
                          {dieta.curso && (
                            <p className="text-sm text-gray-600">{dieta.curso}</p>
                          )}
                        </div>
                        <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                          {dieta.tipo === 'hijo' ? 'Alumno' : 'Personal'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => toggleSection('menu')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center space-x-3">
                <Utensils className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Resumen de Menús</h2>
              </div>
              {expandedSections.has('menu') ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>

            {expandedSections.has('menu') && (
              <div className="space-y-4">
                {data.menu_summary.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Elecciones de Menú</h3>
                    <div className="space-y-2">
                      {data.menu_summary.map((menu, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {menu.opcion_principal} + {menu.opcion_guarnicion}
                            </p>
                          </div>
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                            {menu.cantidad} personas
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.menu_rancho.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Menú Rancho (Asignación Automática)</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-700">
                          Alumnos sin elección de menú (se asigna Rancho por defecto)
                        </p>
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {data.menu_rancho.length} raciones
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {data.menu_rancho.map(c => c.nombre).join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => toggleSection('alumnos')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center space-x-3">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Alumnos ({data.comensales.filter(c => c.tipo === 'hijo').length})
                </h2>
              </div>
              {expandedSections.has('alumnos') ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>

            {expandedSections.has('alumnos') && (
              <div className="space-y-4">
                {groupByGrado(data.comensales.filter(c => c.tipo === 'hijo')).map(([grado, alumnos]) => (
                  <div key={grado} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        {grado} ({alumnos.length} alumnos)
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {alumnos.map((alumno) => (
                        <div key={alumno.id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{alumno.nombre}</p>
                                {alumno.restricciones.length > 0 && (
                                  <span className="text-sm font-semibold text-red-600">
                                    ({alumno.restricciones.join(', ')})
                                  </span>
                                )}
                              </div>
                              {alumno.tiene_eleccion && (
                                <p className="text-sm text-gray-600">
                                  {alumno.opcion_principal} + {alumno.opcion_guarnicion}
                                </p>
                              )}
                              {!alumno.tiene_eleccion && !alumno.tiene_dieta_blanda && (
                                <p className="text-sm text-blue-600 font-medium">Menú Rancho (por defecto)</p>
                              )}
                              {alumno.tiene_dieta_blanda && (
                                <p className="text-sm text-amber-600 font-medium">Dieta Blanda</p>
                              )}
                            </div>
                            {alumno.es_invitacion && (
                              <div className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">
                                Invitado
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.comensales.filter(c => c.tipo === 'padre').length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => toggleSection('personal')}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-6 w-6 text-teal-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Personal del Colegio ({data.comensales.filter(c => c.tipo === 'padre').length})
                  </h2>
                </div>
                {expandedSections.has('personal') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {expandedSections.has('personal') && (
                <div className="space-y-2">
                  {data.comensales.filter(c => c.tipo === 'padre').map((personal) => (
                    <div key={personal.id} className="border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{personal.nombre}</p>
                          {personal.tiene_eleccion && (
                            <p className="text-sm text-gray-600">
                              {personal.opcion_principal} + {personal.opcion_guarnicion}
                            </p>
                          )}
                          {!personal.tiene_eleccion && !personal.tiene_dieta_blanda && (
                            <p className="text-sm text-blue-600 font-medium">Menú Rancho (por defecto)</p>
                          )}
                          {personal.tiene_dieta_blanda && (
                            <p className="text-sm text-amber-600 font-medium">Dieta Blanda</p>
                          )}
                        </div>
                        {personal.es_invitacion && (
                          <div className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium">
                            Invitado
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {data.comensales.filter(c => c.es_invitacion).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <button
                onClick={() => toggleSection('invitaciones')}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center space-x-3">
                  <Gift className="h-6 w-6 text-pink-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Invitaciones del Día ({data.comensales.filter(c => c.es_invitacion).length})
                  </h2>
                </div>
                {expandedSections.has('invitaciones') ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {expandedSections.has('invitaciones') && (
                <div className="space-y-2">
                  {data.comensales.filter(c => c.es_invitacion).map((invitado) => (
                    <div key={invitado.id} className="bg-pink-50 border border-pink-200 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{invitado.nombre}</p>
                          {invitado.curso && (
                            <p className="text-sm text-gray-600">{invitado.curso}</p>
                          )}
                          {invitado.motivo_invitacion && (
                            <p className="text-sm text-gray-500 italic">Motivo: {invitado.motivo_invitacion}</p>
                          )}
                          {invitado.tiene_eleccion && (
                            <p className="text-sm text-gray-600">
                              {invitado.opcion_principal} + {invitado.opcion_guarnicion}
                            </p>
                          )}
                        </div>
                        <div className="bg-pink-600 text-white px-2 py-1 rounded text-xs font-medium">
                          {invitado.tipo === 'hijo' ? 'Alumno' : invitado.tipo === 'padre' ? 'Personal' : 'Externo'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !data && !isWeekend(selectedDate) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-600">No se encontraron datos para esta fecha</p>
        </div>
      )}
    </div>
  );
}
