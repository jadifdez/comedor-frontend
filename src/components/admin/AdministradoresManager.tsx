import React, { useState, useEffect } from 'react';
import { supabase, Administrador } from '../../lib/supabase';
import { Shield, Plus, CreditCard as Edit, Trash2, Mail, Check, X, Search, AlertTriangle, User, Copy, Key, CheckCircle } from 'lucide-react';

export function AdministradoresManager() {
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Administrador | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newAdminCredentials, setNewAdminCredentials] = useState<{email: string, password: string, nombre: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    activo: true
  });

  useEffect(() => {
    loadAdministradores();
  }, []);

  const loadAdministradores = async () => {
    try {
      setLoading(true);
      
      // Usar la función RPC para obtener todos los administradores
      const { data, error } = await supabase
        .rpc('get_all_administradores');

      if (error) throw error;
      setAdministradores(data || []);
    } catch (error) {
      console.error('Error loading administradores:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    try {
      if (editingAdmin) {
        const { error } = await supabase
          .from('administradores')
          .update(formData)
          .eq('id', editingAdmin.id);

        if (error) throw error;

        setFormData({ email: '', nombre: '', activo: true });
        setShowForm(false);
        setEditingAdmin(null);
        loadAdministradores();
      } else {
        const temporaryPassword = generatePassword();

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setSubmitError('No estás autenticado');
          return;
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: temporaryPassword,
            nombre: formData.nombre,
            activo: formData.activo
          })
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.error?.includes('already registered') || result.error?.includes('User already registered')) {
            setSubmitError('Este email ya está registrado en el sistema. Si quieres agregarlo como administrador, primero verifica que tenga una cuenta activa.');
          } else {
            setSubmitError(result.error || 'Error al crear el administrador');
          }
          return;
        }

        setNewAdminCredentials({
          email: formData.email,
          password: temporaryPassword,
          nombre: formData.nombre
        });
        setShowPasswordModal(true);
        setFormData({ email: '', nombre: '', activo: true });
        setShowForm(false);
        setEditingAdmin(null);
        loadAdministradores();
      }
    } catch (error: any) {
      console.error('Error saving administrador:', error);
      setSubmitError(error.message || 'Error desconocido al crear el administrador');
    }
  };

  const handleEdit = (admin: Administrador) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      nombre: admin.nombre,
      activo: admin.activo
    });
    setShowForm(true);
  };

  const handleDeleteClick = (admin: Administrador) => {
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    try {
      const { error } = await supabase
        .from('administradores')
        .delete()
        .eq('id', adminToDelete.id);

      if (error) throw error;
      loadAdministradores();
    } catch (error) {
      console.error('Error deleting administrador:', error);
    } finally {
      setShowDeleteModal(false);
      setAdminToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAdminToDelete(null);
  };

  const toggleActivo = async (admin: Administrador) => {
    try {
      const { error } = await supabase
        .from('administradores')
        .update({ activo: !admin.activo })
        .eq('id', admin.id);

      if (error) throw error;
      loadAdministradores();
    } catch (error) {
      console.error('Error updating administrador status:', error);
    }
  };

  const filteredAdministradores = administradores.filter(admin =>
    admin.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Administradores</h2>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAdmin(null);
            setFormData({ email: '', nombre: '', activo: true });
          }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Administrador</span>
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
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingAdmin ? 'Editar Administrador' : 'Nuevo Administrador'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="admin@ejemplo.com"
                disabled={!!editingAdmin}
                required
              />
              {!editingAdmin && (
                <p className="text-xs text-green-600 mt-1">
                  Se creará automáticamente una cuenta con contraseña temporal
                </p>
              )}
              {editingAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  No puedes cambiar el email de un administrador existente
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nombre del administrador"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="activo" className="text-sm font-medium text-gray-700">Activo</label>
            </div>
            {submitError && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{submitError}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {editingAdmin ? 'Actualizar' : 'Crear Administrador'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAdmin(null);
                  setSubmitError('');
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de administradores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Administrador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdministradores.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{admin.nombre}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActivo(admin)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {admin.activo ? (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(admin)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(admin)}
                        className="text-red-600 hover:text-red-900"
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

      {filteredAdministradores.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay administradores registrados</h3>
          <p className="text-gray-600">Comienza agregando el primer administrador al sistema</p>
        </div>
      )}

      {/* Modal de contraseña temporal */}
      {showPasswordModal && newAdminCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Administrador creado exitosamente
                </h3>
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Key className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">
                      Credenciales de acceso
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-green-700 font-medium">Administrador:</p>
                        <p className="text-sm text-green-900">{newAdminCredentials.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 font-medium">Email:</p>
                        <p className="text-sm text-green-900">{newAdminCredentials.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 font-medium">Contraseña temporal:</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono text-gray-900">
                            {newAdminCredentials.password}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(newAdminCredentials.password);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                          >
                            {copied ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 mb-2">
                      Importante: Guarda esta información
                    </h4>
                    <div className="text-sm text-amber-700 space-y-1">
                      <p>• Esta contraseña solo se muestra UNA VEZ</p>
                      <p>• Compártela de forma segura con el nuevo administrador</p>
                      <p>• El administrador puede cambiar su contraseña después del primer inicio de sesión</p>
                      <p>• Si pierdes esta contraseña, tendrás que resetearla desde Supabase</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewAdminCredentials(null);
                  setCopied(false);
                }}
                className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
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
                ¿Estás seguro de que quieres eliminar a este administrador?
              </p>
              {adminToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{adminToDelete.nombre}</div>
                  <div className="text-sm text-gray-600 flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {adminToDelete.email}
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      ⚠️ ADVERTENCIA
                    </h4>
                    <div className="text-sm text-red-700 space-y-1">
                      <p>• Este administrador perderá acceso inmediatamente al panel</p>
                      <p>• <strong>¡No te elimines a ti mismo!</strong> Perderías el acceso</p>
                      <p>• Esta acción no se puede deshacer</p>
                    </div>
                  </div>
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