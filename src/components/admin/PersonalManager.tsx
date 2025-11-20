import React, { useState, useEffect } from 'react';
import { supabase, Padre, Hijo } from '../../lib/supabase';
import { Users, Plus, CreditCard as Edit, Trash2, Mail, Phone, Check, X, Search, GraduationCap, AlertTriangle, Key, Utensils, Shield } from 'lucide-react';
import { InscribirProfesorModal } from './InscribirProfesorModal';
import { useInscripcionesPadresAdmin, InscripcionPadreAdmin } from '../../hooks/useInscripcionesPadresAdmin';
import { useConfiguracionPrecios } from '../../hooks/useConfiguracionPrecios';

export function PersonalManager() {
  const { configuraciones } = useConfiguracionPrecios();
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
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    telefono: '',
    activo: true,
    es_personal: true,
    exento_facturacion: false,
    motivo_exencion: '',
    fecha_inicio_exencion: '',
    fecha_fin_exencion: ''
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

      // Use optimized RPC function that returns personal with counts in a single query
      const { data, error } = await supabase
        .rpc('get_personal_with_counts');

      if (error) {
        throw error;
      }

      if (data) {
        // Extract counts and inscriptions from the RPC result
        const counts: Record<string, number> = {};
        const inscripciones: Record<string, InscripcionPadreAdmin> = {};

        data.forEach((personal: any) => {
          counts[personal.id] = personal.hijos_count || 0;

          // Mark which personal have active inscriptions
          if (personal.tiene_inscripcion_activa) {
            inscripciones[personal.id] = { padre_id: personal.id } as InscripcionPadreAdmin;
          }
        });

        setPadres(data);
        setHijosCount(counts);
        setInscripcionesActivas(inscripciones);
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
        const { error } = await supabase
          .from('padres')
          .update(formData)
          .eq('id', editingPadre.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('padres')
          .insert([formData]);

        if (error) throw error;
      }

      setFormData({ email: '', nombre: '', telefono: '', activo: true, es_personal: true, exento_facturacion: false, motivo_exencion: '', fecha_inicio_exencion: '', fecha_fin_exencion: '' });
      setShowForm(false);
      setEditingPadre(null);
      loadPadres();
    } catch (error) {
      console.error('Error saving personal:', error);
    }
  };

  const handleEdit = (padre: Padre) => {
    setEditingPadre(padre);
    setFormData({
      email: padre.email,
      nombre: padre.nombre,
      telefono: padre.telefono || '',
      activo: padre.activo,
      es_personal: padre.es_personal,
      exento_facturacion: padre.exento_facturacion || false,
      motivo_exencion: padre.motivo_exencion || '',
      fecha_inicio_exencion: padre.fecha_inicio_exencion || '',
      fecha_fin_exencion: padre.fecha_fin_exencion || ''
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
      const { error } = await supabase
        .from('padres')
        .delete()
        .eq('id', padreToDelete.id);

      if (error) throw error;
      loadPadres();
    } catch (error) {
      console.error('Error deleting personal:', error);
    } finally {
      setShowDeleteModal(false);
      setPadreToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPadreToDelete(null);
  };

  const toggleActivo = async (padre: Padre) => {
    try {
      const { error } = await supabase
        .from('padres')
        .update({ activo: !padre.activo })
        .eq('id', padre.id);

      if (error) throw error;
      loadPadres();
    } catch (error) {
      console.error('Error updating personal status:', error);
    }
  };

  const togglePadreExpansion = async (padreId: string) => {
    // If closing, just close
    if (expandedPadre === padreId) {
      setExpandedPadre(null);
      return;
    }

    // If opening and we don't have the details yet, load them
    if (!hijosDetails[padreId]) {
      try {
        const { data, error } = await supabase
          .from('hijos')
          .select(`
            *,
            grado:grados(*)
          `)
          .eq('padre_id', padreId)
          .eq('activo', true)
          .order('nombre');

        if (error) throw error;

        if (data) {
          setHijosDetails(prev => ({
            ...prev,
            [padreId]: data
          }));
        }
      } catch (error) {
        console.error('Error loading hijos details:', error);
      }
    }

    setExpandedPadre(padreId);
  };

  const handleSendPasswordReset = async (padre: Padre) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(padre.email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

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

  const handleAddHijo = (padreId: string, padreNombre: string) => {
    if (onAddHijo) {
      onAddHijo(padreId, padreNombre);
    } else {
      localStorage.setItem('selectedPadreForNewHijo', JSON.stringify({
        id: padreId,
        nombre: padreNombre
      }));
      window.dispatchEvent(new CustomEvent('addHijoToPadre', {
        detail: { padreId, padreNombre }
      }));
      const event = new CustomEvent('changeAdminTab', {
        detail: { tab: 'hijos' }
      });
      window.dispatchEvent(event);
    }
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

    if (result.success) {
      await loadPadres();
    }

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

  const getDiasComedorText = (padreId: string) => {
    const inscripcion = inscripcionesActivas[padreId];
    if (!inscripcion) return 'No inscrito';

    const diasLabels = ['', 'L', 'M', 'X', 'J', 'V'];
    const diasTexto = inscripcion.dias_semana.map((dia: number) => diasLabels[dia]).join(', ');
    return `${inscripcion.dias_semana.length} días (${diasTexto})`;
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Personal</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingPadre(null);
            setFormData({ email: '', nombre: '', telefono: '', activo: true, es_personal: true, exento_facturacion: false, motivo_exencion: '', fecha_inicio_exencion: '', fecha_fin_exencion: '' });
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Personal</span>
        </button>
      </div>

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

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPadre ? 'Editar Personal' : 'Nuevo Personal'}
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

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="exento_facturacion"
                  checked={formData.exento_facturacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, exento_facturacion: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="exento_facturacion" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Exento de facturación (100%)</span>
                </label>
              </div>

              {formData.exento_facturacion && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo de exención <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.motivo_exencion}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo_exencion: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Monitora de comedor, Personal directivo, etc."
                      required={formData.exento_facturacion}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha inicio exención (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_inicio_exencion}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio_exencion: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha fin exención (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.fecha_fin_exencion}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_fin_exencion: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si se deja vacío, la exención será permanente
                    </p>
                  </div>
                </div>
              )}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Personal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hijos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPadres.map((padre) => (
                <React.Fragment key={padre.id}>
                  <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <button
                        onClick={() => togglePadreExpansion(padre.id)}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left truncate"
                      >
                        {padre.nombre}
                      </button>
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
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => toggleActivo(padre)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          padre.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
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
                      {padre.exento_facturacion && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title={padre.motivo_exencion || 'Exento de facturación'}>
                          <Shield className="h-3 w-3 mr-1" />
                          EXENTO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium w-32">
                    <div className="flex space-x-2 flex-shrink-0">
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
                        title="Editar personal"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(padre)}
                        className="text-red-600 hover:text-red-900 flex-shrink-0"
                        title="Eliminar personal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  </tr>
                  {expandedPadre === padre.id && (
                    <tr>
                      <td colSpan={4} className="px-6 py-2 bg-gray-50">
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
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      hijo.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay personal registrado</h3>
          <p className="text-gray-600">Comienza agregando el primer miembro del personal al sistema</p>
        </div>
      )}

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
                ¿Estás seguro de que quieres eliminar a este miembro del personal?
              </p>
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
                      <h4 className="text-sm font-semibold text-red-800 mb-2">
                        ADVERTENCIA: Eliminación en cascada
                      </h4>
                      <div className="text-sm text-red-700 space-y-1">
                        <p>Al eliminar este miembro del personal también se eliminarán:</p>
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

      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`flex-shrink-0 rounded-full p-2 ${
                passwordResetStatus.success
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}>
                {passwordResetStatus.success ? (
                  <Check className="h-6 w-6 text-green-600" />
                ) : (
                  <X className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {passwordResetStatus.success
                    ? 'Email enviado correctamente'
                    : 'Error al enviar email'}
                </h3>
              </div>
            </div>

            <div className="mb-6">
              {passwordResetStatus.success ? (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Se ha enviado un correo electrónico con instrucciones para restablecer la contraseña a:
                  </p>
                  {passwordResetStatus.padre && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="font-medium text-gray-900 mb-1">
                        {passwordResetStatus.padre.nombre}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-green-600" />
                        {passwordResetStatus.padre.email}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    No se pudo enviar el correo de restablecimiento de contraseña.
                  </p>
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
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  passwordResetStatus.success
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

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
