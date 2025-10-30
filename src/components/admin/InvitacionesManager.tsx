import React, { useState, useEffect } from 'react';
import { Calendar, UserPlus, Trash2, Users } from 'lucide-react';
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

const DIAS_SEMANA = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' }
];

export const InvitacionesManager: React.FC = () => {
  const { invitaciones, loading, error, createInvitacion, deleteInvitacion } = useInvitaciones();
  const [showForm, setShowForm] = useState(false);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invitacionToDelete, setInvitacionToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<InvitacionFormData>({
    fechas: [],
    tipo_invitado: 'hijo',
    motivo: '',
    es_recurrente: false
  });

  const [singleFecha, setSingleFecha] = useState('');
  const [recurrenteConfig, setRecurrenteConfig] = useState({
    dia_semana: 1,
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
      dia_semana: 1,
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
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Invitaciones</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Día de la Semana
                  </label>
                  <select
                    value={recurrenteConfig.dia_semana}
                    onChange={(e) => setRecurrenteConfig({ ...recurrenteConfig, dia_semana: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {DIAS_SEMANA.map((dia) => (
                      <option key={dia.value} value={dia.value}>
                        {dia.label}
                      </option>
                    ))}
                  </select>
                </div>
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
              {invitaciones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No hay invitaciones registradas</p>
                  </td>
                </tr>
              ) : (
                invitaciones.map((invitacion) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
