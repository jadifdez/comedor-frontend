import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Users, AlertCircle, GraduationCap, Briefcase, UserPlus, ChevronDown, ChevronUp, Clock, UserCheck, Ban, RotateCcw, Plus, X, DollarSign, UtensilsCrossed } from 'lucide-react';
import { useDailyManagement, DailyDiner } from '../../hooks/useDailyManagement';
import { generateDailyPDF } from '../../utils/dailyPdfExport';
import { supabase } from '../../lib/supabase';
import { useAltasPuntualesAdmin } from '../../hooks/useAltasPuntualesAdmin';
import { NotificationModal } from '../NotificationModal';
import { ConfirmModal } from '../ConfirmModal';
import { AttendanceRestrictionsTable } from './AttendanceRestrictionsTable';

export function DailyManagementView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
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
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  }>({ isOpen: false, type: 'info', title: '' });

  const formatDateISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const getMenuSummary = () => {
    if (!data) return null;

    const activeDiners = data.comensales.filter(c => !c.cancelado_ultimo_momento);
    const menuCounts: { [key: string]: number } = {};

    activeDiners.forEach(comensal => {
      let menuType: string;

      if (comensal.tiene_dieta_blanda) {
        menuType = 'Dieta Blanda';
      } else if (comensal.tiene_menu_personalizado && comensal.tiene_eleccion) {
        menuType = `Menú Personalizado: ${comensal.opcion_principal} + ${comensal.opcion_guarnicion}`;
      } else if (comensal.tiene_menu_personalizado) {
        menuType = 'Menú Personalizado (sin detalle)';
      } else if (comensal.tiene_eleccion) {
        menuType = `${comensal.opcion_principal} + ${comensal.opcion_guarnicion}`;
      } else {
        menuType = 'Menú Rancho';
      }

      menuCounts[menuType] = (menuCounts[menuType] || 0) + 1;
    });

    return Object.entries(menuCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([menu, count]) => ({ menu, count }));
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

      const bajaData: any = {
        hijo: selectedComensal.nombre,
        dias: [selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })],
        fecha_inicio: formatDateISO(selectedDate),
        fecha_fin: formatDateISO(selectedDate),
        user_id: userData.user.id,
        motivo: cancelMotivo || 'Cancelación administrativa'
      };

      if (selectedComensal.hijo_id) {
        bajaData.hijo_id = selectedComensal.hijo_id;
        bajaData.curso = selectedComensal.curso || 'Sin curso';
      } else if (selectedComensal.padre_id) {
        bajaData.padre_id = selectedComensal.padre_id;
        bajaData.curso = 'Personal del colegio';
      }

      const { data: insertedData, error } = await supabase
        .from('comedor_bajas')
        .insert([bajaData])
        .select();

      if (error) {
        console.error('Error detallado al insertar baja:', error);
        throw error;
      }

      console.log('Baja creada exitosamente:', insertedData);
      setShowCancelModal(false);
      setSelectedComensal(null);
      setCancelMotivo('');
      refetch();
    } catch (error: any) {
      console.error('Error al cancelar comida:', error);
      const errorMessage = error?.message || 'Error desconocido';
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al cancelar la comida',
        message: `${errorMessage}. Por favor, verifica que tienes permisos de administrador.`
      });
    } finally {
      setProcessingCancel(false);
    }
  };

  const handleRestoreClick = (comensal: DailyDiner) => {
    setSelectedComensal(comensal);
    setShowRestoreModal(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedComensal) return;

    try {
      const fechaISO = formatDateISO(selectedDate);

      let query = supabase
        .from('comedor_bajas')
        .delete()
        .lte('fecha_inicio', fechaISO)
        .gte('fecha_fin', fechaISO);

      if (selectedComensal.hijo_id) {
        query = query.eq('hijo_id', selectedComensal.hijo_id);
      } else if (selectedComensal.padre_id) {
        query = query.eq('padre_id', selectedComensal.padre_id);
      } else {
        return;
      }

      const { error } = await query;

      if (error) throw error;

      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Comida restaurada',
        message: `La comida de ${selectedComensal.nombre} ha sido restaurada correctamente.`
      });

      refetch();
    } catch (error) {
      console.error('Error al restaurar comida:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al restaurar la comida',
        message: 'Por favor, intenta de nuevo.'
      });
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
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al cargar la lista',
        message: errorMsg
      });
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
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Datos incompletos',
        message: 'Por favor, selecciona una persona y proporciona un motivo'
      });
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
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al crear la invitación',
        message: 'Por favor, intenta de nuevo.'
      });
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
          .eq('es_personal', true)
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
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al cargar la lista',
        message: errorMsg
      });
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
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Selecciona una persona',
        message: 'Debes seleccionar una persona para crear el alta puntual'
      });
      return;
    }

    const result = await createAltasPuntuales({
      tipo_persona: altaTipoPersona,
      persona_id: altaPersonaId,
      fechas: [formatDateISO(selectedDate)]
    });

    if (result.success) {
      setShowAltaPuntualModal(false);
      setAltaPersonaId('');
      setAltaTipoPersona('hijo');
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Alta puntual creada',
        message: 'Se ha registrado correctamente'
      });
      // Pequeño delay para asegurar que la DB haya procesado el cambio
      setTimeout(() => refetch(), 300);
    } else {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error al crear alta puntual',
        message: result.error
      });
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
                            {comensal.es_alta_puntual && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                SE FACTURA
                              </span>
                            )}
                            {comensal.es_invitacion && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                                {comensal.motivo_invitacion || 'Invitación'}
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
                            {comensal.es_alta_puntual && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                SE FACTURA
                              </span>
                            )}
                            {comensal.es_invitacion && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                                {comensal.motivo_invitacion || 'Invitación'}
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
                            {comensal.es_alta_puntual && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                SE FACTURA
                              </span>
                            )}
                            {comensal.es_invitacion && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                                {comensal.motivo_invitacion || 'Invitación'}
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Día anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNextDay}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Día siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={goToTomorrow}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Mañana
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 sm:flex-none">
              <p className="text-lg font-bold text-gray-900 capitalize truncate">
                {formatDate(selectedDate)}
              </p>
              {(isWeekend(selectedDate) || data?.es_festivo) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-amber-700 truncate">
                    {isWeekend(selectedDate)
                      ? 'Fin de semana'
                      : `Festivo: ${data.nombre_festivo}`}
                  </span>
                </div>
              )}
            </div>
            <input
              type="date"
              value={formatDateISO(selectedDate)}
              onChange={handleDateChange}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
          {/* Tabla de Asistencia por Restricciones */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => toggleSection('restricciones')}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <div className="flex items-center space-x-3">
                <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Resumen de Asistencia por Curso y Restricciones
                </h2>
              </div>
              {expandedSections.has('restricciones') ? (
                <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
              )}
            </button>

            {expandedSections.has('restricciones') && (
              <div className="mt-4">
                <AttendanceRestrictionsTable
                  comensales={data.comensales}
                  restriccionesActivas={data.restricciones_activas}
                />
              </div>
            )}
          </div>

          {/* Resumen de Menús Elegidos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => toggleSection('menus')}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <div className="flex items-center space-x-3">
                <UtensilsCrossed className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Resumen de Menús Elegidos
                </h2>
              </div>
              {expandedSections.has('menus') ? (
                <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
              )}
            </button>

            {expandedSections.has('menus') && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getMenuSummary()?.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-600 mb-1">
                            {item.menu}
                          </h3>
                          <p className="text-3xl font-bold text-blue-900">
                            {item.count}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {((item.count / data.comensales.filter(c => !c.cancelado_ultimo_momento).length) * 100).toFixed(1)}% del total
                          </p>
                        </div>
                        <UtensilsCrossed className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                  ))}
                </div>
                {(!getMenuSummary() || getMenuSummary()?.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No hay datos de menús para mostrar
                  </div>
                )}
              </div>
            )}
          </div>

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
                    Comensales Inscritos ({data.comensales_recurrentes.length})
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
            {data.comensales_puntuales.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <button
                  onClick={() => toggleSection('puntuales')}
                  className="w-full flex items-center justify-between mb-4 group"
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-6 w-6 text-purple-600" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Comensales Puntuales ({data.comensales_puntuales.length})
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="flex items-center gap-1 text-blue-700">
                          <DollarSign className="h-4 w-4" />
                          Altas puntuales: {data.comensales_puntuales.filter(c => c.es_alta_puntual).length}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-green-700">
                          Invitaciones: {data.comensales_puntuales.filter(c => c.es_invitacion).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedSections.has('puntuales') ? (
                    <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  )}
                </button>

                {expandedSections.has('puntuales') && (
                  <div className="mt-4">
                    {renderComensalesTable(data.comensales_puntuales, 'puntuales')}
                  </div>
                )}
              </div>
            )}
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
                Esta acción registrará una baja para <strong>{formatDate(selectedDate)}</strong> y no será facturada.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la baja (opcional)
              </label>
              <textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ej: Cancelación administrativa, enfermedad..."
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
                    key={altaTipoPersona}
                    value={altaPersonaId}
                    onChange={(e) => setAltaPersonaId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {personas
                      .filter(p => p.tipo === altaTipoPersona)
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

      <ConfirmModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setSelectedComensal(null);
        }}
        onConfirm={handleRestoreConfirm}
        title="Restaurar comida"
        message={selectedComensal ? `¿Deseas restaurar la comida de ${selectedComensal.nombre}? Esta acción eliminará la cancelación y el comensal volverá a aparecer en la lista activa.` : ''}
        confirmText="Restaurar"
        cancelText="Cancelar"
        type="info"
      />

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
