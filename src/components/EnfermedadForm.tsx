import React, { useState } from 'react';
import { Calendar, User, Send, Check, GraduationCap, Heart, AlertTriangle } from 'lucide-react';
import { Hijo, Enfermedad, InscripcionComedor, InscripcionComedorPadre, SolicitudComida } from '../lib/supabase';
import { getNext10WorkDays } from '../utils/dateUtils';

interface EnfermedadFormData {
  hijoId: string;
  fechasDietaBlanda: string[];
}

interface OpcionUnificada {
  id: string;
  nombre: string;
  detalle: string | undefined;
  tipo: 'hijo' | 'padre';
}

interface EnfermedadFormProps {
  onSubmit: (data: EnfermedadFormData) => void;
  hijos: Hijo[];
  enfermedades: Enfermedad[];
  inscripciones: InscripcionComedor[];
  inscripcionesPadre?: InscripcionComedorPadre[];
  solicitudes?: SolicitudComida[];
  nombrePadre?: string;
  padreId?: string;
  isSubmitting?: boolean;
  diasAntelacion?: number;
}

export function EnfermedadForm({
  onSubmit,
  hijos,
  enfermedades,
  inscripciones,
  inscripcionesPadre,
  solicitudes = [],
  nombrePadre,
  padreId,
  isSubmitting = false,
  diasAntelacion = 2
}: EnfermedadFormProps) {
  const [diasDisponibles, setDiasDisponibles] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  
  const [formData, setFormData] = useState<EnfermedadFormData>({
    hijoId: '',
    fechasDietaBlanda: []
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
    const tieneInscripcionActivaPadre = inscripcionesPadre?.some(i => i.activo) || false;
    const opcionesPadre: OpcionUnificada[] = tieneInscripcionActivaPadre && padreId && nombrePadre
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

  // Convertir fecha dd/mm/yyyy a YYYY-MM-DD
  const convertirFechaISO = (fechaDDMMYYYY: string): string => {
    const partes = fechaDDMMYYYY.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`; // YYYY-MM-DD
    }
    return fechaDDMMYYYY; // Si ya está en otro formato, devolverlo tal cual
  };

  // Verificar si un día está disponible para dieta blanda (persona inscrita ese día O con solicitud puntual aprobada)
  const isDayAvailableForDietaBlanda = (fechaId: string, personaId: string) => {
    const date = new Date(fechaId + 'T00:00:00');
    const diaSemana = date.getDay();

    // Verificar si es el padre o un hijo
    const isPadre = padreId === personaId;

    // Primero verificar si hay una solicitud puntual aprobada para este día
    const tieneSolicitudPuntual = solicitudes.some(solicitud => {
      const fechaSolicitudISO = convertirFechaISO(solicitud.fecha);
      if (isPadre) {
        return solicitud.padre_id === personaId && fechaSolicitudISO === fechaId && solicitud.estado === 'aprobada';
      } else {
        return solicitud.hijo_id === personaId && fechaSolicitudISO === fechaId && solicitud.estado === 'aprobada';
      }
    });

    // Si hay solicitud puntual aprobada, el día está disponible
    if (tieneSolicitudPuntual) return true;

    // Si no hay solicitud puntual, verificar inscripción regular
    if (isPadre) {
      // Para el padre, verificar inscripciones de padre
      return inscripcionesPadre?.some(inscripcion =>
        inscripcion.activo &&
        inscripcion.dias_semana.includes(diaSemana)
      ) || false;
    } else {
      // Para hijos, verificar inscripciones de comedor
      return inscripciones.some(inscripcion =>
        inscripcion.hijo_id === personaId &&
        inscripcion.activo &&
        inscripcion.dias_semana.includes(diaSemana)
      );
    }
  };

  const handleFechaDietaBlandaToggle = (fechaId: string) => {
    // No permitir seleccionar fechas que ya tienen solicitudes
    if (isDayDisabled(fechaId)) return;
    
    setFormData(prev => ({
      ...prev,
      fechasDietaBlanda: prev.fechasDietaBlanda.includes(fechaId)
        ? prev.fechasDietaBlanda.filter(f => f !== fechaId)
        : [...prev.fechasDietaBlanda, fechaId]
    }));
  };

  const isDayDisabled = (fechaId: string) => {
    if (!formData.hijoId) return false;

    // No disponible si la persona no está inscrita ese día
    if (!isDayAvailableForDietaBlanda(fechaId, formData.hijoId)) return true;

    // No disponible si ya tiene solicitud para esta fecha
    return enfermedades.some(enfermedad =>
      (enfermedad.hijo_id === formData.hijoId || enfermedad.padre_id === formData.hijoId) &&
      enfermedad.fecha_dieta_blanda === fechaId
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hijoId || formData.fechasDietaBlanda.length === 0) return;
    
    onSubmit(formData);
    setFormData({ hijoId: '', fechasDietaBlanda: [] });
  };

  const isFormValid = formData.hijoId && formData.fechasDietaBlanda.length > 0;
  const selectedPersona = opcionesUnificadas.find(p => p.id === formData.hijoId);
  const tieneInscripcionActiva = formData.hijoId ? isDayAvailableForDietaBlanda(
    diasDisponibles[0]?.id || new Date().toISOString().split('T')[0],
    formData.hijoId
  ) : false;

  // Si no hay personas con inscripciones activas, no mostrar el formulario
  if (opcionesUnificadas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Heart className="h-6 w-6 text-red-600" />
        <h2 className="text-xl font-semibold text-gray-900">Solicitar dieta blanda</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de persona (hijo o padre) */}
        <div>
          <label htmlFor="hijoId" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <User className="h-4 w-4" />
            <span>Seleccionar persona</span>
          </label>
          <select
            id="hijoId"
            value={formData.hijoId}
            onChange={(e) => setFormData(prev => ({ ...prev, hijoId: e.target.value, fechasDietaBlanda: [] }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            required
          >
            <option value="">Selecciona una persona...</option>
            {opcionesUnificadas.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.nombre} - {opcion.detalle}
              </option>
            ))}
          </select>
        </div>


        {/* Mensaje si no tiene inscripción */}
        {formData.hijoId && !tieneInscripcionActiva && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  Sin inscripción al comedor
                </h4>
                <p className="text-sm text-yellow-700">
                  {selectedPersona?.nombre} no tiene una inscripción activa al comedor.
                  Debe estar inscrito para poder solicitar dieta blanda.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selección de días para dieta blanda */}
        {formData.hijoId && (
        <div>
          {loadingDays ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando días disponibles...</span>
            </div>
          ) : (
            <>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Próximos días laborables disponibles para dieta blanda
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            {diasDisponibles.map((dia) => {
              const isDisabled = isDayDisabled(dia.id);
              const isNotInscribed = !isDayAvailableForDietaBlanda(dia.id, formData.hijoId);
              const isSelected = formData.fechasDietaBlanda.includes(dia.id);
              
              return (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => handleFechaDietaBlandaToggle(dia.id)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                    ${isDisabled || isNotInscribed
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-bold text-lg">{dia.label}</span>
                  <span className="text-xs text-center">{dia.fecha}</span>
                  {(isDisabled || isNotInscribed) && (
                    <AlertTriangle className="h-4 w-4 absolute top-1 right-1 text-gray-400" />
                  )}
                  {isSelected && !isDisabled && (
                    <Check className="h-4 w-4 absolute top-1 right-1 text-red-600" />
                  )}
                </button>
              );
            })}
          </div>
          {formData.fechasDietaBlanda.length > 0 && (
            <p className="mt-3 text-sm text-gray-600">
              Días seleccionados: {formData.fechasDietaBlanda.length}
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
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Enviando comunicación...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Solicitar dieta blanda</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}