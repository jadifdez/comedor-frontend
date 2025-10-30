// src/components/admin/PadresManager.tsx
import React, { useState, useEffect } from 'react';
import { supabase, Padre, Hijo } from '../../lib/supabase';
import { sendAppEmail } from '../../lib/mail';
import {
  Users,
  Plus,
  CreditCard as Edit,
  Trash2,
  Mail,
  Phone,
  Check,
  X,
  Search,
  GraduationCap,
  AlertTriangle,
  Key,
  Utensils,
  Send
} from 'lucide-react';
import { InscribirProfesorModal } from './InscribirProfesorModal';
import { useInscripcionesPadresAdmin, InscripcionPadreAdmin } from '../../hooks/useInscripcionesPadresAdmin';

export function PadresManager() {
  const [padres, setPadres] = useState<Padre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPadre, setEditingPadre] = useState<Padre | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hijosCount, setHijosCount] = useState<Record<string, number>>({});
  const [expandedPadre, setExpandedPadre] = useState<string | null>(null);
  const [hijosDetails, setHijosDetails] = useState<Record<string, Hijo[]>>({});
  const [onAddHijo, setOnAddHijo] = useState<((padreId: string, padreNombre: string) => void) | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [padreToDelete, setPadreToDelete] = useState<Padre | null>(null);

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [passwordResetStatus, setPasswordResetStatus] = useState<{
    success: boolean;
    message: string;
    padre: Padre | null;
  }>({ success: false, message: '', padre: null });

  // ===== Nuevo estado para enviar email desde backend =====
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Padre | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    telefono: '',
    activo: true,
    es_personal: false
  });

  const [showInscribirModal, setShowInscribirModal] = useState(false);
  const [profesorToInscribir, setProfesorToInscribir] = useState<Padre | null>(null);
  const [inscripcionesActivas, setInscripcionesActivas] = useState<Record<string, InscripcionPadreAdmin>>({});
  const { crearInscripcion, verificarInscripcionActiva } = useInscripcionesPadresAdmin();

  useEffect(() => {
    loadPadres();
  }, []);

  const loadPadres = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('padres')
        .select('*')
        .order('nombre');

      if (error) throw error;

      setPadres(data || []);

      // Inscripciones activas de Personal
      if (data && data.length > 0) {
        const profesores = data.filter(p => p.es_personal);
        const inscripcionesMap: Record<string, InscripcionPadreAdmin> = {};

        for (const profesor of profesores) {
          const inscripcion = await verificarInscripcionActiva(profesor.id);
          if (inscripcion) inscripcionesMap[profesor.id] = inscripcion;
        }
        setInscripcionesActivas(inscripcionesMap);
      }

      // Hijos y conteos
      if (data && data.length > 0) {
        const { data: hijosData, error: hijosError } = await supabase
          .from('hijos')
          .select(`*, grado:grados(*)`)
          .order('nombre');

        if (!hijosError) {
          const counts: Record<string, number> = {};
          const details: Record<string, Hijo[]> = {};
          hijosData?.forEach((hijo) => {
            counts[hijo.padre_id] = (counts[hijo.padre_id] || 0) + 1;
            if (!details[hijo.padre_id]) details[hijo.padre_id] = [];
            details[hijo.padre_id].push(hijo);
          });
          setHijosCount(counts);
          setHijosDetails(details);
        }
      }
    } catch (error) {
      console.error('Error in loadPadres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPadre) {
        const { error } = await supabase.from('padres').update(formData).eq('id', editingPadre.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('padres').insert([formData]);
        if (error) throw error;
      }
      setFormData({ email: '', nombre: '', telefono: '', activo: true, es_personal: false });
      setShowForm(false);
      setEditingPadre(null);
      loadPadres();
    } catch (error) {
      console.error('Error saving padre:', error);
    }
  };

  const handleEdit = (padre: Padre) => {
    setEditingPadre(padre);
    setFormData({
      email: padre.email,
      nombre: padre.nombre,
      telefono: padre.telefono || '',
      activo: padre.activo,
      es_personal: padre.es_personal || false
    });
    setShowForm(true);
  };

  const handleDeleteClick = (padre: Padre) => {
    setPadreToDelete(padre);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!padreToDelete) return;
    try {
      const { error } = await supabase.from('padres').delete().eq('id', padreToDelete.id);
      if (error) throw error;
      loadPadres();
    } catch (error) {
      console.error('Error deleting padre:', error);
    } finally {
      setShowDeleteModal(false);
      setPadreToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPadreToDelete(null);
  };

  const handleInscribirProfesor = (padre: Padre) => {
    setProfesorToInscribir(padre);
    setShowInscribirModal(true);
  };

  const handleInscripcionSubmit = async (diasSemana: number[], fechaInicio: string) => {
    if (!profesorToInscribir) {
      return { success: false, error: 'No se ha seleccionado ningún profesor' };
    }
    const result = await crearInscripcion(profesorToInscribir.id, diasSemana, fechaInicio);
    if (result.success) await loadPadres();
    return result;
  };

  const handleInscripcionSuccess = () => {
    setShowInscribirModal(false);
    setProfesorToInscribir(null);
  };

  const handleInscripcionClose = () => {
    setShowInscribirModal(false);
    setProfesorToInscribir(null);
  };

  const toggleActivo = async (padre: Padre) => {
    try {
      const { error } = await supabase.from('padres').update({ activo: !padre.activo }).eq('id', padre.id);
      if (error) throw error;
      loadPadres();
    } catch (error) {
      console.error('Error updating padre status:', error);
    }
  };

  const togglePadreExpansion = (padreId: string) => {
    setExpandedPadre(expandedPadre === padreId ? null : padreId);
  };

  // ==== Supabase reset password (se mantiene como lo tenías) ====
const handleSendPasswordReset = async (padre: Padre) => {
  try {
    // 1) sesión (para Bearer)
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Usuario no autenticado');

    // 2) API propia → genera link + envía con tu SMTP
    const res = await fetch(`${import.meta.env.VITE_MAIL_API_URL}/api/auth/recovery-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: padre.email,
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Error enviando recuperación');

    setPasswordResetStatus({
      success: true,
      message: 'Email enviado correctamente',
      padre
    });
    setShowPasswordResetModal(true);
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    setPasswordResetStatus({
      success: false,
      message: error.message || 'Error al enviar el correo',
      padre
    });
    setShowPasswordResetModal(true);
  }
};


  // ======= NUEVO: Enviar email a través de tu backend =======
  const openEmailModal = (padre: Padre) => {
    setEmailTarget(padre);
    // Plantilla inicial (ajústala a tu caso)
    setEmailSubject(`[Comedor Escolar] Información importante`);
    setEmailBody(
`Hola ${padre.nombre},

Te escribimos desde el comedor escolar para informarte de que ya puedes gestionar las inscripciones, bajas puntuales y elecciones de menú desde tu área privada.

Accede desde: ${window.location.origin}

Si necesitas ayuda, responde a este correo.

Un saludo,
Equipo del Comedor`
    );
    setEmailResult(null);
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    if (sendingEmail) return;
    setShowEmailModal(false);
    setEmailTarget(null);
    setEmailSubject('');
    setEmailBody('');
    setEmailResult(null);
  };

  const handleSendBackendEmail = async () => {
    if (!emailTarget) return;
    try {
      setSendingEmail(true);
      setEmailResult(null);

      // Convierte saltos de línea en br para un HTML simple
      const html = `<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#222; line-height:1.5">
        ${emailBody.split('\n').map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('')}
      </div>`;

      const res = await sendAppEmail({
        to: emailTarget.email,
        subject: emailSubject,
        html,
        // opcional: text en claro (útil para clientes que prefieren texto)
        text: emailBody,
        // opcional: replyTo si quieres que contesten a otra dirección
        // replyTo: 'secretaria@colegio.com'
      });

      setEmailResult({ ok: true, msg: `Enviado (ID: ${res?.messageId || '—'})` });
    } catch (err: any) {
      console.error('Error enviando email backend:', err);
      setEmailResult({ ok: false, msg: err?.message || 'Error enviando email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredPadres = padres.filter(padre =>
    padre.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    padre.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Padres</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingPadre(null);
            setFormData({ email: '', nombre: '', telefono: '', activo: true, es_personal: false });
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Padre</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Formulario alta/edición */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPadre ? 'Editar Padre' : 'Nuevo Padre'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="es_personal"
                checked={formData.es_personal}
                onChange={(e) => setFormData(prev => ({ ...prev, es_personal: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="es_personal" className="text-sm font-medium text-gray-700">
                Personal del colegio
              </label>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingPadre ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPadre(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Padre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hijos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPadres.map((padre) => (
                <React.Fragment key={padre.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => togglePadreExpansion(padre.id)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left truncate"
                          >
                            {padre.nombre}
                          </button>
                          {padre.es_personal && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                              Personal
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate" title={padre.email}>{padre.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {padre.telefono && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {padre.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {hijosCount[padre.id] || 0} {hijosCount[padre.id] === 1 ? 'hijo' : 'hijos'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActivo(padre)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          padre.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {padre.activo ? (
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
                    <td className="px-6 py-4 text-sm font-medium w-40">
                      <div className="flex space-x-2 flex-shrink-0">
                        {/* NUEVO: Enviar email backend */}
                        <button
                          onClick={() => openEmailModal(padre)}
                          className="text-blue-600 hover:text-blue-900 flex-shrink-0"
                          title="Enviar email"
                        >
                          <Send className="h-4 w-4" />
                        </button>

                        {padre.es_personal && (
                          <button
                            onClick={() => handleInscribirProfesor(padre)}
                            className={`${inscripcionesActivas[padre.id] ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}`}
                            title={inscripcionesActivas[padre.id] ? 'Ver inscripción al comedor' : 'Inscribir al comedor'}
                          >
                            <Utensils className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleSendPasswordReset(padre)}
                          className="text-green-600 hover:text-green-900 flex-shrink-0"
                          title="Enviar email para restablecer contraseña"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(padre)}
                          className="text-blue-600 hover:text-blue-900 flex-shrink-0"
                          title="Editar padre"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(padre)}
                          className="text-red-600 hover:text-red-900 flex-shrink-0"
                          title="Eliminar padre"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedPadre === padre.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-2 bg-gray-50">
                        {hijosDetails[padre.id]?.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Hijos ({hijosDetails[padre.id].length})
                              </h4>
                              <button
                                onClick={() => handleAddHijo(padre.id, padre.nombre)}
                                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Añadir hijo</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                              {hijosDetails[padre.id].map((hijo) => (
                                <div key={hijo.id} className="bg-white p-2 rounded border border-gray-200 text-xs">
                                  <div className="font-medium text-gray-800 truncate">{hijo.nombre}</div>
                                  <div className="text-gray-600 truncate">
                                    {hijo.grado?.nombre || 'Sin grado asignado'}
                                  </div>
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${hijo.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {hijo.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">Sin hijos registrados</p>
                              <button
                                onClick={() => handleAddHijo(padre.id, padre.nombre)}
                                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors mx-auto"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Añadir primer hijo</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPadres.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay padres registrados</h3>
          <p className="text-gray-600">Comienza agregando el primer padre al sistema</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">¿Estás seguro de que quieres eliminar a este padre?</p>
              {padreToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{padreToDelete.nombre}</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {padreToDelete.email}
                  </div>
                </div>
              )}

              {padreToDelete && hijosCount[padreToDelete.id] > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ ADVERTENCIA: Eliminación en cascada</h4>
                      <div className="text-sm text-red-700 space-y-1">
                        <p>Al eliminar este padre también se eliminarán:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li><strong>{hijosCount[padreToDelete.id]} hijo{hijosCount[padreToDelete.id] !== 1 ? 's' : ''}</strong></li>
                          <li>Todas las <strong>bajas de comedor</strong> de sus hijos</li>
                          <li>Todas las <strong>solicitudes puntuales</strong> de sus hijos</li>
                          <li>Todas las <strong>elecciones de menú</strong> de sus hijos</li>
                          <li>Todas las <strong>solicitudes de dieta blanda</strong> de sus hijos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Modal de confirmación de envío de email de reset (Supabase) */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`flex-shrink-0 rounded-full p-2 ${passwordResetStatus.success ? 'bg-green-100' : 'bg-red-100'}`}>
                {passwordResetStatus.success ? <Check className="h-6 w-6 text-green-600" /> : <X className="h-6 w-6 text-red-600" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {passwordResetStatus.success ? 'Email enviado correctamente' : 'Error al enviar email'}
                </h3>
              </div>
            </div>

            <div className="mb-6">
              {passwordResetStatus.success ? (
                <div className="space-y-4">
                  <p className="text-gray-600">Se ha enviado un correo electrónico con instrucciones para restablecer la contraseña a:</p>
                  {passwordResetStatus.padre && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="font-medium text-gray-900 mb-1">{passwordResetStatus.padre.nombre}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-green-600" />
                        {passwordResetStatus.padre.email}
                      </div>
                    </div>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Key className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Instrucciones para el padre/madre:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Revisar la bandeja de entrada del correo electrónico</li>
                          <li>Hacer clic en el enlace recibido</li>
                          <li>Establecer una nueva contraseña</li>
                          <li>Iniciar sesión con la nueva contraseña</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">No se pudo enviar el correo de restablecimiento de contraseña.</p>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
                        <p className="text-sm text-red-700">{passwordResetStatus.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPasswordResetModal(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${passwordResetStatus.success ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO: Modal de enviar email (backend) */}
      {showEmailModal && emailTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 rounded-full p-2 bg-blue-100">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enviar email</h3>
                <p className="text-sm text-gray-600">A: <span className="font-medium">{emailTarget.nombre}</span> &lt;{emailTarget.email}&gt;</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Asunto del correo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Escribe tu mensaje…"
                />
                <p className="text-xs text-gray-500 mt-1">Se enviará como HTML simple (los saltos de línea se respetan).</p>
              </div>

              {emailResult && (
                <div className={`rounded-lg border p-3 ${emailResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start space-x-2">
                    {emailResult.ok ? <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" /> : <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div className={`text-sm ${emailResult.ok ? 'text-green-800' : 'text-red-800'}`}>
                      {emailResult.msg}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={closeEmailModal}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                disabled={sendingEmail}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBackendEmail}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-60"
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
              >
                {sendingEmail ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de inscripción al comedor */}
      {showInscribirModal && profesorToInscribir && (
        <InscribirProfesorModal
          profesor={profesorToInscribir}
          onClose={handleInscripcionClose}
          onSuccess={handleInscripcionSuccess}
          onSubmit={handleInscripcionSubmit}
        />
      )}
    </div>
  );
}

// ======= helpers locales =======
function handleAddHijo(padreId: string, padreNombre: string) {
  // fallback de tu versión original
  localStorage.setItem('selectedPadreForNewHijo', JSON.stringify({ id: padreId, nombre: padreNombre }));
  window.dispatchEvent(new CustomEvent('addHijoToPadre', { detail: { padreId, padreNombre } }));
  const event = new CustomEvent('changeAdminTab', { detail: { tab: 'hijos' } });
  window.dispatchEvent(event);
}
