import React from 'react';
import { Utensils, Calendar, User, Trash2, Euro, Clock, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { InscripcionComedor } from '../lib/supabase';

interface InscripcionComedorListProps {
  inscripciones: InscripcionComedor[];
  onDesactivar: (id: string) => void;
  calcularPrecioMensual: (inscripcion: InscripcionComedor) => number;
}

const diasSemanaLabels = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function InscripcionComedorList({ inscripciones, onDesactivar, calcularPrecioMensual }: InscripcionComedorListProps) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [inscripcionToDelete, setInscripcionToDelete] = React.useState<InscripcionComedor | null>(null);
  const [expandedInactivas, setExpandedInactivas] = React.useState<Set<string>>(new Set());

  const handleDeleteClick = (inscripcion: InscripcionComedor) => {
    setInscripcionToDelete(inscripcion);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (inscripcionToDelete) {
      onDesactivar(inscripcionToDelete.id);
      setShowDeleteModal(false);
      setInscripcionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setInscripcionToDelete(null);
  };

  const toggleInactivaExpanded = (id: string) => {
    setExpandedInactivas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Separar inscripciones activas e inactivas
  const inscripcionesActivas = inscripciones.filter(i => i.activo);
  const inscripcionesInactivas = inscripciones.filter(i => !i.activo);

  if (inscripciones.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay inscripciones al comedor</h3>
        <p className="text-gray-600">Las inscripciones al comedor aparecerán aquí</p>
      </div>
    );
  }

  const renderInscripcion = (inscripcion: InscripcionComedor, isActive: boolean) => {
    if (!isActive) {
      const isExpanded = expandedInactivas.has(inscripcion.id);

      return (
        <div
          key={inscripcion.id}
          className="bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <button
            onClick={() => toggleInactivaExpanded(inscripcion.id)}
            className="w-full p-2 flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-700 truncate">
                {inscripcion.hijo_details?.nombre}
              </span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-600">
                {inscripcion.dias_semana.length} días
              </span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs font-medium text-gray-700">
                {calcularPrecioMensual(inscripcion).toFixed(2)}€/mes
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
            )}
          </button>

          {isExpanded && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-200">
              <div className="flex items-center space-x-2 mt-2">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {inscripcion.dias_semana.map(d => diasSemanaLabels[d]).join(', ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <Euro className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">
                    {inscripcion.precio_diario.toFixed(2)}€/día
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">
                    {(inscripcion.dias_semana.length * inscripcion.precio_diario).toFixed(2)}€/sem
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                <span>Desde: {new Date(inscripcion.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                {inscripcion.fecha_fin && (
                  <span>Hasta: {new Date(inscripcion.fecha_fin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={inscripcion.id}
        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {inscripcion.hijo_details?.nombre} ({inscripcion.hijo_details?.grado?.nombre})
                </span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Días: {inscripcion.dias_semana.map(d => diasSemanaLabels[d]).join(', ')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <div className="flex items-center space-x-1">
                  <Euro className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {inscripcion.precio_diario.toFixed(2)}€/día
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {(inscripcion.dias_semana.length * inscripcion.precio_diario).toFixed(2)}€/semana
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Euro className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {calcularPrecioMensual(inscripcion).toFixed(2)}€/mes
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Inscrito: {new Date(inscripcion.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Desde: {new Date(inscripcion.fecha_inicio).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteClick(inscripcion)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Desactivar inscripción"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
        <Utensils className="h-5 w-5 text-blue-600" />
        <span>Inscripciones al comedor ({inscripciones.length})</span>
      </h3>
      
      {/* Inscripciones activas */}
      {inscripcionesActivas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-800 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Inscripciones activas ({inscripcionesActivas.length})</span>
          </h4>
          {inscripcionesActivas.map((inscripcion) => renderInscripcion(inscripcion, true))}
        </div>
      )}

      {/* Resumen total solo para inscripciones activas */}
      {inscripcionesActivas.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <Euro className="h-4 w-4 mr-1" />
            Resumen mensual (solo inscripciones activas)
          </h4>
          <div className="text-sm text-green-700">
            <p>Total estimado por mes: <span className="font-bold text-lg">
              {inscripcionesActivas.reduce((total, inscripcion) => 
                total + calcularPrecioMensual(inscripcion), 0
              ).toFixed(2)}€
            </span></p>
            <p className="text-xs mt-1">* Cálculo aproximado basado en 4.33 semanas por mes</p>
          </div>
        </div>
      )}

      {/* Inscripciones inactivas/históricas */}
      {inscripcionesInactivas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-600 flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-gray-500" />
            <span>Historial de inscripciones ({inscripcionesInactivas.length})</span>
          </h4>
          {inscripcionesInactivas.map((inscripcion) => renderInscripcion(inscripcion, false))}
        </div>
      )}

      {/* Modal de confirmación de desactivación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmar desactivación
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que quieres desactivar esta inscripción al comedor?
              </p>
              {inscripcionToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="font-medium text-gray-900">{inscripcionToDelete.hijo_details?.nombre}</div>
                  <div className="text-sm text-gray-600">{inscripcionToDelete.hijo_details?.grado?.nombre}</div>
                  <div className="text-sm text-gray-600">
                    Días: {inscripcionToDelete.dias_semana.map(d => diasSemanaLabels[d]).join(', ')}
                  </div>
                  <div className="text-sm text-gray-600">
                    Precio mensual: {calcularPrecioMensual(inscripcionToDelete).toFixed(2)}€
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800 font-medium">
                    La inscripción se desactivará y se establecerá la fecha de fin.
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
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}