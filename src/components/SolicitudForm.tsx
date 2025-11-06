import React, { useState } from 'react';
import { Calendar, User, Send, Check, GraduationCap, Plus, AlertTriangle } from 'lucide-react';
import { Hijo, SolicitudComida, InscripcionComedor } from '../lib/supabase';
import { InscripcionPadre } from '../hooks/useInscripcionesPadres';
import { getNext10WorkDays } from '../utils/dateUtils';

interface SolicitudFormData {
  hijoId: string;
  fechas: string[];
}

interface OpcionUnificada {
  id: string;
  nombre: string;
  detalle?: string;
  tipo: 'hijo' | 'padre';
}

interface SolicitudFormProps {
  onSubmit: (data: SolicitudFormData) => void;
  hijos: Hijo[];
  solicitudes: SolicitudComida[];
  inscripciones: InscripcionComedor[];
  inscripcionesPadre?: InscripcionPadre[];
  nombrePadre?: string;
  padreId?: string;
  isSubmitting?: boolean;
  diasAntelacion?: number;
}

export function SolicitudForm({ onSubmit, hijos, solicitudes, inscripciones, inscripcionesPadre = [], nombrePadre = '', padreId = '', isSubmitting = false, diasAntelacion = 2 }: SolicitudFormProps) {
  const [diasDisponibles, setDiasDisponibles] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  
  const [formData, setFormData] = useState<SolicitudFormData>({
    hijoId: '',
    fechas: []
  });

  // Crear lista unificada de opciones (hijos + padre)
  const opcionesUnificadas = React.useMemo((): OpcionUnificada[] => {
    const opcionesHijos: OpcionUnificada[] = hijos.map(hijo => ({
      id: hijo.id,
      nombre: hijo.nombre,
      detalle: hijo.grado?.nombre,
      tipo: 'hijo' as const
    }));

    // El padre solo aparece si tiene inscripciones activas de comedor
    const opcionesPadre: OpcionUnificada[] = inscripcionesPadre && inscripcionesPadre.length > 0 && padreId && nombrePadre
      ? [{
          id: padreId,
          nombre: nombrePadre,
          detalle: 'Personal del colegio',
          tipo: 'padre' as const
        }]
      : [];

    return [...opcionesPadre, ...opcionesHijos];
  }, [hijos, inscripcionesPadre, padreId, nombrePadre]);

  React.useEffect(() => {
    const loadDays = async () => {
      setLoadingDays(true);
      try {
        const days = await getNext10WorkDays(diasAntelacion);
        setDiasDisponibles(days);
      } catch (error) {
        console.error('Error loading work days:', error);
      } finally {
        setLoadingDays(false);
      }
    };

    loadDays();
  }, [diasAntelacion]);

  const handleFechaToggle = (fechaId: string) => {
    // No permitir seleccionar fechas que ya tienen solicitudes
    if (isDayDisabled(fechaId)) return;
    
    setFormData(prev => ({
      ...prev,
      fechas: prev.fechas.includes(fechaId)
        ? prev.fechas.filter(f => f !== fechaId)
        : [...prev.fechas, fechaId]
    }));
  };

  const isDayDisabled = (fechaId: string) => {
    if (!formData.hijoId) return false;

    const date = new Date(fechaId + 'T00:00:00');
    const diaSemana = date.getDay(); // 0=domingo, 1=lunes, etc.

    // Verificar si es el padre o un hijo
    const isPadre = padreId === formData.hijoId;

    let tieneInscripcion = false;

    if (isPadre) {
      // Para el padre, verificar inscripciones de padre
      tieneInscripcion = inscripcionesPadre?.some(inscripcion =>
        inscripcion.activo &&
        inscripcion.dias_semana.includes(diaSemana)
      ) || false;
    } else {
      // Para hijos, verificar inscripciones de comedor
      tieneInscripcion = inscripciones.some(inscripcion =>
        inscripcion.hijo_id === formData.hijoId &&
        inscripcion.activo &&
        inscripcion.dias_semana.includes(diaSemana)
      );
    }

    // Si tiene inscripción ese día, deshabilitar (solo puede solicitar en días NO inscritos)
    if (tieneInscripcion) return true;

    // Verificar si ya tiene solicitud para esta fecha
    const fechaFormateada = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const tieneSolicitud = solicitudes.some(solicitud => {
      if (isPadre) {
        return solicitud.padre_id === formData.hijoId && solicitud.fecha === fechaFormateada;
      } else {
        return solicitud.hijo_id === formData.hijoId && solicitud.fecha === fechaFormateada;
      }
    });

    // Si ya tiene solicitud para esa fecha, también deshabilitar
    return tieneSolicitud;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hijoId || formData.fechas.length === 0) return;
    
    onSubmit(formData);
    setFormData({ hijoId: '', fechas: [] });
  };

  const isFormValid = formData.hijoId && formData.fechas.length > 0;
  const selectedPersona = opcionesUnificadas.find(o => o.id === formData.hijoId);

  // Si no hay personas disponibles, no mostrar el formulario
  if (opcionesUnificadas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Plus className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Solicitar comida puntual</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de persona */}
        <div>
          <label htmlFor="hijoId" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <User className="h-4 w-4" />
            <span>Seleccionar persona</span>
          </label>
          <select
            id="hijoId"
            value={formData.hijoId}
            onChange={(e) => setFormData(prev => ({ ...prev, hijoId: e.target.value, fechas: [] }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            required
          >
            <option value="">Selecciona una persona...</option>
            {opcionesUnificadas.map((opcion) => (
              <option key={`${opcion.tipo}-${opcion.id}`} value={opcion.id}>
                {opcion.nombre}{opcion.detalle ? ` - ${opcion.detalle}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selección de días */}
        {formData.hijoId && (
        <div>
          {loadingDays ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando días disponibles...</span>
            </div>
          ) : (
            <>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4" />
            <span>Próximos días laborables disponibles</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {diasDisponibles.map((dia) => {
              const isDisabled = isDayDisabled(dia.id);
              const isSelected = formData.fechas.includes(dia.id);
              
              return (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => handleFechaToggle(dia.id)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                    ${isDisabled
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-bold text-lg">{dia.label}</span>
                  <span className="text-xs text-center">{dia.fecha}</span>
                  {isDisabled && (
                    <AlertTriangle className="h-4 w-4 absolute top-1 right-1 text-gray-400" />
                  )}
                  {isSelected && !isDisabled && (
                    <Check className="h-4 w-4 absolute top-1 right-1 text-green-600" />
                  )}
                </button>
              );
            })}
          </div>
          {formData.fechas.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              Días seleccionados: {formData.fechas.length}
            </p>
          )}
            </>
          )}
        </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`
            w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isFormValid && !isSubmitting
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Enviando solicitud...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Enviar solicitud</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}