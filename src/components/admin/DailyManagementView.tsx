import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Users, AlertCircle, GraduationCap, Briefcase, UserPlus, ChevronDown, ChevronUp, Clock, UserCheck, Ban, RotateCcw, Plus, X, DollarSign } from 'lucide-react';
import { useDailyManagement, DailyDiner } from '../../hooks/useDailyManagement';
import { generateDailyPDF } from '../../utils/dailyPdfExport';
import { supabase } from '../../lib/supabase';
import { useAltasPuntualesAdmin } from '../../hooks/useAltasPuntualesAdmin';

export function DailyManagementView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['recurrentes', 'puntuales']));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set([
    'recurrentes-personal', 'recurrentes-alumnos', 'recurrentes-externos',
    'puntuales-personal', 'puntuales-alumnos', 'puntuales-externos'
  ]));
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedComensal, setSelectedComensal] = useState<DailyDiner | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);
  const [showInvitacionModal, setShowInvitacionModal] = useState(false);
  const [invitacionTipo, setInvitacionTipo] = useState<'hijo' | 'padre'>('hijo');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [invitacionMotivo, setInvitacionMotivo] = useState('');
  const [processingInvitacion, setProcessingInvitacion] = useState(false);
  const [personas, setPersonas] = useState<Array<{id: string, nombre: string, tipo: 'hijo' | 'padre'}>>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [showAltaPuntualModal, setShowAltaPuntualModal] = useState(false);
  const [altaTipoPersona, setAltaTipoPersona] = useState<'hijo' | 'padre'>('hijo');
  const [altaPersonaId, setAltaPersonaId] = useState('');
  const { loading: processingAlta, createAltasPuntuales } = useAltasPuntualesAdmin();

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

  const loadPersonas = async () => {
    setLoadingPersonas(true);
    try {
      const [hijosResult, padresResult] = await Promise.all([
        supabase
          .from('hijos')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase
          .from('padres')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true })
      ]);

      if (hijosResult.error) {
        console.error('Error al cargar hijos:', hijosResult.error);
        throw hijosResult.error;
      }
      if (padresResult.error) {
        console.error('Error al cargar padres:', padresResult.error);
        throw padresResult.error;
      }

      const hijosList = (hijosResult.data || []).map(h => ({
        id: h.id,
        nombre: h.nombre,
        tipo: 'hijo' as const
      }));

      const padresList = (padresResult.data || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        tipo: 'padre' as const
      }));

      setPersonas([...hijosList, ...padresList]);
    } catch (err: any) {
      console.error('Error al cargar personas:', err);
      const errorMsg = err?.message || 'Error desconocido';
      alert(`Error al cargar la lista de personas: ${errorMsg}`);
    } finally {
      setLoadingPersonas(false);
    }
  };

  const handleOpenInvitacionModal = async () => {
    setShowInvitacionModal(true);
    await loadPersonas();
  };

  const handleCreateInvitacion = async () => {
    if (!selectedPersonId || !invitacionMotivo.trim()) {
      alert('Por favor, selecciona una persona y proporciona un motivo');
      return;
    }

    setProcessingInvitacion(true);
    try {
      const persona = personas.find(p => p.id === selectedPersonId);
      if (!persona) return;

      const invitacion = {
        fecha: formatDateISO(selectedDate),
        [persona.tipo === 'hijo' ? 'hijo_id' : 'padre_id']: selectedPersonId,
        motivo: invitacionMotivo.trim()
      };

      const { error } = await supabase
        .from('invitaciones_comedor')
        .insert(invitacion);

      if (error) throw error;

      refetch();
      setShowInvitacionModal(false);
      setSelectedPersonId('');
      setInvitacionMotivo('');
      setInvitacionTipo('hijo');
    } catch (err) {
      console.error('Error al crear invitación:', err);
      alert('Error al crear la invitación. Por favor, intenta de nuevo.');
    } finally {
      setProcessingInvitacion(false);
    }
  };

  const loadPersonasDisponibles = async (fecha: string) => {
    setLoadingPersonas(true);
    try {
      const fechaDate = new Date(fecha);
      const diaSemana = fechaDate.getDay();
      const fechaFormateada = fechaDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const [hijosResult, padresResult, inscripcionesResult, inscripcionesPadreResult, altasResult] = await Promise.all([
        supabase
          .from('hijos')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase
          .from('padres')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase
          .from('comedor_inscripciones')
          .select('hijo_id, dias_semana')
          .eq('activo', true),
        supabase
          .from('comedor_inscripciones_padres')
          .select('padre_id, dias_semana')
          .eq('activo', true),
        supabase
          .from('comedor_altaspuntuales')
          .select('hijo_id, padre_id, fecha')
          .eq('fecha', fechaFormateada)
      ]);

      if (hijosResult.error) throw hijosResult.error;
      if (padresResult.error) throw padresResult.error;
      if (inscripcionesResult.error) throw inscripcionesResult.error;
      if (inscripcionesPadreResult.error) throw inscripcionesPadreResult.error;
      if (altasResult.error) throw altasResult.error;

      const inscripciones = inscripcionesResult.data || [];
      const inscripcionesPadre = inscripcionesPadreResult.data || [];
      const altas = altasResult.data || [];

      const hijosConComidaHoy = new Set<string>();
      inscripciones.forEach(insc => {
        if (insc.dias_semana.includes(diaSemana)) {
          hijosConComidaHoy.add(insc.hijo_id);
        }
      });
      altas.forEach(alta => {
        if (alta.hijo_id) hijosConComidaHoy.add(alta.hijo_id);
      });

      const padresConComidaHoy = new Set<string>();
      inscripcionesPadre.forEach(insc => {
        if (insc.dias_semana.includes(diaSemana)) {
          padresConComidaHoy.add(insc.padre_id);
        }
      });
      altas.forEach(alta => {
        if (alta.padre_id) padresConComidaHoy.add(alta.padre_id);
      });

      const hijosDisponibles = (hijosResult.data || [])
        .filter(h => !hijosConComidaHoy.has(h.id))
        .map(h => ({
          id: h.id,
          nombre: h.nombre,
          tipo: 'hijo' as const
        }));

      const padresDisponibles = (padresResult.data || [])
        .filter(p => !padresConComidaHoy.has(p.id))
        .map(p => ({
          id: p.id,
          nombre: p.nombre,
          tipo: 'padre' as const
        }));

      setPersonas([...hijosDisponibles, ...padresDisponibles]);
    } catch (err: any) {
      console.error('Error al cargar personas disponibles:', err);
      const errorMsg = err?.message || 'Error desconocido';
      alert(`Error al cargar la lista de personas: ${errorMsg}`);
    } finally {
      setLoadingPersonas(false);
    }
  };

  const handleOpenAltaPuntualModal = async () => {
    setShowAltaPuntualModal(true);
    await loadPersonasDisponibles(formatDateISO(selectedDate));
  };

  const handleCreateAltaPuntual = async () => {
    if (!altaPersonaId) {
      alert('Por favor, selecciona una persona');
      return;
    }

    const result = await createAltasPuntuales({
      tipo_persona: altaTipoPersona,
      persona_id: altaPersonaId,
      fechas: [formatDateISO(selectedDate)]
    });

    if (result.success) {
      refetch();
      setShowAltaPuntualModal(false);
      setAltaPersonaId('');
      setAltaTipoPersona('hijo');
      alert('Se ha creado el alta puntual correctamente');
    } else {
      alert(`Error al crear alta puntual: ${result.error}`);
    }
  };


  const renderComensalesTable = (comensales: DailyDiner[], prefix: string) => {
    const personal = comensales.filter(c => c.tipo === 'padre');
    const alumnos = comensales.filter(c => c.tipo === 'hijo');
    const externos = comensales.filter(c => c.tipo === 'externo');

    return (
      <div className="space-y-4">
        {personal.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(`${prefix}-personal`)}
              className="w-full flex items-center justify-between bg-green-50 px-4 py-3 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Personal ({personal.length})</h4>
              </div>
              {expandedGroups.has(`${prefix}-personal`) ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has(`${prefix}-personal`) && (
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
              onClick={() => toggleGroup(`${prefix}-alumnos`)}
              className="w-full flex items-center justify-between bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Alumnos ({alumnos.length})</h4>
              </div>
              {expandedGroups.has(`${prefix}-alumnos`) ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has(`${prefix}-alumnos`) && (
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
              onClick={() => toggleGroup(`${prefix}-externos`)}
              className="w-full flex items-center justify-between bg-purple-50 px-4 py-3 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Invitados Externos ({externos.length})</h4>
              </div>
              {expandedGroups.has(`${prefix}-externos`) ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>
            {expandedGroups.has(`${prefix}-externos`) && (
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
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenAltaPuntualModal}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            <DollarSign className="h-5 w-5" />
            <span>Alta Puntual</span>
          </button>
          <button
            onClick={handleOpenInvitacionModal}
            disabled={loading}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            <span>Invitación</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={!data || loading}
            className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            <Download className="h-5 w-5" />
            <span>PDF</span>
          </button>
        </div>
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
                    renderComensalesTable(data.comensales_recurrentes, 'recurrentes')
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
                    renderComensalesTable(data.comensales_puntuales, 'puntuales')
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

      {/* Modal Añadir Invitación */}
      {showInvitacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Añadir Invitación</h3>
              <button
                onClick={() => {
                  setShowInvitacionModal(false);
                  setSelectedPersonId('');
                  setInvitacionMotivo('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="text"
                  value={formatDate(selectedDate)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de persona
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="hijo"
                      checked={invitacionTipo === 'hijo'}
                      onChange={(e) => {
                        setInvitacionTipo(e.target.value as 'hijo' | 'padre');
                        setSelectedPersonId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Alumno</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="padre"
                      checked={invitacionTipo === 'padre'}
                      onChange={(e) => {
                        setInvitacionTipo(e.target.value as 'hijo' | 'padre');
                        setSelectedPersonId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Personal</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar persona
                </label>
                {loadingPersonas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                    <span>Cargando personas...</span>
                  </div>
                ) : personas.length === 0 ? (
                  <div className="text-sm text-red-600">
                    No se encontraron personas disponibles
                  </div>
                ) : (
                  <select
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {personas
                      .filter(p => p.tipo === invitacionTipo)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo
                </label>
                <textarea
                  value={invitacionMotivo}
                  onChange={(e) => setInvitacionMotivo(e.target.value)}
                  rows={3}
                  placeholder="Describe el motivo de la invitación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowInvitacionModal(false);
                  setSelectedPersonId('');
                  setInvitacionMotivo('');
                }}
                disabled={processingInvitacion}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateInvitacion}
                disabled={processingInvitacion || !selectedPersonId || !invitacionMotivo.trim()}
                className="flex-1 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingInvitacion ? 'Creando...' : 'Crear Invitación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alta Puntual Facturada */}
      {showAltaPuntualModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Crear Alta Puntual (Facturada)</h3>
              </div>
              <button
                onClick={() => {
                  setShowAltaPuntualModal(false);
                  setAltaPersonaId('');
                  setAltaTipoPersona('hijo');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium">
                Las altas puntuales SÍ se facturan. Para invitaciones gratuitas, usa el botón "Invitación".
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Solo se muestran personas sin comida asignada para este día.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de persona
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="hijo"
                      checked={altaTipoPersona === 'hijo'}
                      onChange={(e) => {
                        setAltaTipoPersona(e.target.value as 'hijo' | 'padre');
                        setAltaPersonaId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Alumno</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="padre"
                      checked={altaTipoPersona === 'padre'}
                      onChange={(e) => {
                        setAltaTipoPersona(e.target.value as 'hijo' | 'padre');
                        setAltaPersonaId('');
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Personal</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar persona
                </label>
                {loadingPersonas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span>Cargando personas...</span>
                  </div>
                ) : personas.length === 0 ? (
                  <div className="text-sm text-red-600">
                    No se encontraron personas disponibles
                  </div>
                ) : (
                  <select
                    value={altaPersonaId}
                    onChange={(e) => setAltaPersonaId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {personas
                      .filter(p => {
                        console.log('Persona:', p.nombre, 'Tipo:', p.tipo, 'Filtro:', altaTipoPersona, 'Match:', p.tipo === altaTipoPersona);
                        return p.tipo === altaTipoPersona;
                      })
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Fecha:</span> {selectedDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAltaPuntualModal(false);
                  setAltaPersonaId('');
                  setAltaTipoPersona('hijo');
                }}
                disabled={processingAlta}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateAltaPuntual}
                disabled={processingAlta || !altaPersonaId}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingAlta ? 'Creando...' : 'Crear Alta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
