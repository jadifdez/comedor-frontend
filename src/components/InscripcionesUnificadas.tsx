import React from 'react';
import { Utensils, Calendar, User, Trash2, Clock, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { InscripcionComedor } from '../lib/supabase';
import { InscripcionPadre } from '../hooks/useInscripcionesPadres';

interface InscripcionesUnificadasProps {
  inscripcionesHijos: InscripcionComedor[];
  inscripcionesPadre: InscripcionPadre[];
  onDesactivarHijo: (id: string) => void;
  onDesactivarPadre: (id: string) => void;
  calcularPrecioMensualHijo: (inscripcion: InscripcionComedor) => number;
  calcularPrecioMensualPadre: (inscripcion: InscripcionPadre) => number;
  nombrePadre: string;
  esPersonal: boolean;
}

const diasSemanaLabels = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function InscripcionesUnificadas({
  inscripcionesHijos,
  inscripcionesPadre,
  onDesactivarHijo,
  onDesactivarPadre,
  calcularPrecioMensualHijo,
  calcularPrecioMensualPadre,
  nombrePadre,
  esPersonal
}: InscripcionesUnificadasProps) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: 'hijo' | 'padre'; id: string; data: any } | null>(null);
  const [expandedInactivas, setExpandedInactivas] = React.useState<Set<string>>(new Set());

  const handleDeleteClick = (type: 'hijo' | 'padre', id: string, data: any) => {
    setDeleteTarget({ type, id, data });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'hijo') {
        onDesactivarHijo(deleteTarget.id);
      } else {
        onDesactivarPadre(deleteTarget.id);
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
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

  const inscripcionesActivasHijos = inscripcionesHijos.filter(i => i.activo);
  const inscripcionesInactivasHijos = inscripcionesHijos.filter(i => !i.activo);
  const inscripcionesActivasPadre = inscripcionesPadre.filter(i => i.activo);
  const inscripcionesInactivasPadre = inscripcionesPadre.filter(i => !i.activo);

  const todasActivas = [...inscripcionesActivasPadre, ...inscripcionesActivasHijos];
  const todasInactivas = [...inscripcionesInactivasPadre, ...inscripcionesInactivasHijos];
  const totalInscripciones = inscripcionesHijos.length + inscripcionesPadre.length;

  if (totalInscripciones === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Utensils className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay inscripciones al comedor</h3>
        <p className="text-gray-600">Las inscripciones al comedor aparecerán aquí</p>
      </div>
    );
  }

  const renderInscripcionPadre = (inscripcion: InscripcionPadre, isActive: boolean) => {
    if (!isActive) {
      const isExpanded = expandedInactivas.has(`padre-${inscripcion.id}`);

      return (
        <div
          key={`padre-${inscripcion.id}`}
          className="bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <button
            onClick={() => toggleInactivaExpanded(`padre-${inscripcion.id}`)}
            className="w-full p-2 flex items-center justify-between text-left"
          >
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate">
                  {nombrePadre} (Personal)
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-600">
                  {inscripcion.dias_semana.length} días
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Desde: {new Date(inscripcion.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                {inscripcion.fecha_fin && (
                  <>
                    <span>·</span>
                    <span>Hasta: {new Date(inscripcion.fecha_fin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </>
                )}
              </div>
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

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
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
        key={`padre-${inscripcion.id}`}
        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {nombrePadre}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Personal
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
              onClick={() => handleDeleteClick('padre', inscripcion.id, inscripcion)}
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

  const renderInscripcionHijo = (inscripcion: InscripcionComedor, isActive: boolean) => {
    if (!isActive) {
      const isExpanded = expandedInactivas.has(`hijo-${inscripcion.id}`);

      return (
        <div
          key={`hijo-${inscripcion.id}`}
          className="bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <button
            onClick={() => toggleInactivaExpanded(`hijo-${inscripcion.id}`)}
            className="w-full p-2 flex items-center justify-between text-left"
          >
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate">
                  {inscripcion.hijo_details?.nombre}
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-600">
                  {inscripcion.dias_semana.length} días
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Desde: {new Date(inscripcion.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                {inscripcion.fecha_fin && (
                  <>
                    <span>·</span>
                    <span>Hasta: {new Date(inscripcion.fecha_fin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </>
                )}
              </div>
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

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
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
        key={`hijo-${inscripcion.id}`}
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
              onClick={() => handleDeleteClick('hijo', inscripcion.id, inscripcion)}
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
        <span>Inscripciones al comedor ({totalInscripciones})</span>
      </h3>

      {todasActivas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-800 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Inscripciones activas ({todasActivas.length})</span>
          </h4>
          {inscripcionesActivasPadre.map((inscripcion) => renderInscripcionPadre(inscripcion, true))}
          {inscripcionesActivasHijos.map((inscripcion) => renderInscripcionHijo(inscripcion, true))}
        </div>
      )}

      {todasInactivas.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-600 flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-gray-500" />
            <span>Historial de inscripciones ({todasInactivas.length})</span>
          </h4>
          {inscripcionesInactivasPadre.map((inscripcion) => renderInscripcionPadre(inscripcion, false))}
          {inscripcionesInactivasHijos.map((inscripcion) => renderInscripcionHijo(inscripcion, false))}
        </div>
      )}

      {showDeleteModal && deleteTarget && (
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
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                {deleteTarget.type === 'padre' ? (
                  <>
                    <div className="font-medium text-gray-900">{nombrePadre} (Personal)</div>
                    <div className="text-sm text-gray-600">
                      Días: {deleteTarget.data.dias_semana.map((d: number) => diasSemanaLabels[d]).join(', ')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-gray-900">{deleteTarget.data.hijo_details?.nombre}</div>
                    <div className="text-sm text-gray-600">{deleteTarget.data.hijo_details?.grado?.nombre}</div>
                    <div className="text-sm text-gray-600">
                      Días: {deleteTarget.data.dias_semana.map((d: number) => diasSemanaLabels[d]).join(', ')}
                    </div>
                  </>
                )}
              </div>

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