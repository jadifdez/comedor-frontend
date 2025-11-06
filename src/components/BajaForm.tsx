import React, { useState } from 'react';
import { Calendar, User, Send, Check, GraduationCap, AlertTriangle } from 'lucide-react';
import { Hijo, Grado, BajaComedor, InscripcionComedor } from '../lib/supabase';
import { InscripcionPadre } from '../hooks/useInscripcionesPadres';
import { getNext10WorkDays } from '../utils/dateUtils';

interface BajaFormData {
  hijoId: string;
  fechas: string[];
}

interface InscripcionUnificada {
  id: string;
  dias_semana: number[];
  activo: boolean;
  tipo: 'hijo' | 'padre';
  nombre: string;
  detalle?: string;
}

interface BajaFormProps {
  onSubmit: (data: BajaFormData) => void;
  hijos: Hijo[];
  bajas: BajaComedor[];
  inscripciones: InscripcionComedor[];
  inscripcionesPadre?: InscripcionPadre[];
  nombrePadre?: string;
  padreId?: string;
  isSubmitting?: boolean;
  diasAntelacion?: number;
}

export function BajaForm({ onSubmit, hijos, bajas, inscripciones, inscripcionesPadre = [], nombrePadre = '', padreId = '', isSubmitting = false, diasAntelacion = 2 }: BajaFormProps) {
  const [diasDisponibles, setDiasDisponibles] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  
  const [formData, setFormData] = useState<BajaFormData>({
    hijoId: '',
    fechas: []
  });

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

  // Crear lista unificada de opciones (hijos + padre)
  const opcionesUnificadas = React.useMemo((): InscripcionUnificada[] => {
    const opcionesHijos: InscripcionUnificada[] = hijos
      .filter(hijo => inscripciones.some(i => i.hijo_id === hijo.id && i.activo))
      .map(hijo => {
        const inscripcion = inscripciones.find(i => i.hijo_id === hijo.id && i.activo)!;
        return {
          id: hijo.id,
          dias_semana: inscripcion.dias_semana,
          activo: inscripcion.activo,
          tipo: 'hijo' as const,
          nombre: hijo.nombre,
          detalle: hijo.grado?.nombre
        };
      });

    const opcionesPadre: InscripcionUnificada[] = inscripcionesPadre
      .filter(i => i.activo)
      .map(inscripcion => ({
        id: padreId,
        dias_semana: inscripcion.dias_semana,
        activo: inscripcion.activo,
        tipo: 'padre' as const,
        nombre: nombrePadre,
        detalle: 'Personal del colegio'
      }));

    return [...opcionesPadre, ...opcionesHijos];
  }, [hijos, inscripciones, inscripcionesPadre, padreId, nombrePadre]);

  // Obtener la inscripción activa del hijo o padre seleccionado
  const getInscripcionActiva = (id: string) => {
    return opcionesUnificadas.find(o => o.id === id);
  };

  // Verificar si un día está disponible para baja (inscrito ese día)
  const isDayAvailableForBaja = (fechaId: string, id: string) => {
    const inscripcion = getInscripcionActiva(id);
    if (!inscripcion) return false;
    const date = new Date(fechaId + 'T00:00:00');
    const diaSemana = date.getDay(); // 0=domingo, 1=lunes, etc.
    return inscripcion.dias_semana.includes(diaSemana);
  };

  const isDayDisabled = (fechaId: string) => {
    if (!formData.hijoId) return false;
    
    // No disponible si el hijo no está inscrito ese día
    if (!isDayAvailableForBaja(fechaId, formData.hijoId)) return true;

    // Convertir fechaId (YYYY-MM-DD) al formato usado en bajas (DD/MM/YYYY)
    const date = new Date(fechaId + 'T00:00:00');
    const fechaFormateada = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    
    return bajas.some(baja => 
      baja.hijo_id === formData.hijoId && 
      baja.dias.includes(fechaFormateada)
    );
  };

  const handleFechaToggle = (fechaId: string) => {
    // No permitir seleccionar fechas que ya tienen bajas
    if (isDayDisabled(fechaId)) return;
    
    // No permitir seleccionar fechas en las que el hijo no está inscrito
    if (!isDayAvailableForBaja(fechaId, formData.hijoId)) return;
    
    setFormData(prev => ({
      ...prev,
      fechas: prev.fechas.includes(fechaId)
        ? prev.fechas.filter(f => f !== fechaId)
        : [...prev.fechas, fechaId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hijoId || formData.fechas.length === 0) return;
    
    onSubmit(formData);
    setFormData({ hijoId: '', fechas: [] });
  };

  const isFormValid = formData.hijoId && formData.fechas.length > 0;
  const selectedPersona = opcionesUnificadas.find(o => o.id === formData.hijoId);
  const inscripcionActiva = formData.hijoId ? getInscripcionActiva(formData.hijoId) : null;

  // Si no hay inscripciones activas, no mostrar el formulario
  if (opcionesUnificadas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Calendar className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Comunicar baja de comedor</h2>
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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

        {/* Mostrar información de la inscripción seleccionada */}
        {inscripcionActiva && selectedPersona && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">
                  Inscripción actual de {selectedPersona.nombre}
                </h4>
                <p className="text-sm text-blue-700">
                  Días inscritos: {inscripcionActiva.dias_semana.map(d => {
                    const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
                    return dias[d];
                  }).join(', ')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Solo puedes comunicar bajas de los días en los que está inscrito
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mostrar curso del hijo seleccionado */}
        {/* Selección de días */}
        {formData.hijoId && (
        <div>
          {loadingDays ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando días disponibles...</span>
            </div>
          ) : (
            <>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4" />
            <span>Selecciona los días lectivos para dar de baja</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {diasDisponibles.map((dia) => {
              const isDisabled = isDayDisabled(dia.id);
              const isNotInscribed = !isDayAvailableForBaja(dia.id, formData.hijoId);
              const isSelected = formData.fechas.includes(dia.id);
              
              return (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => handleFechaToggle(dia.id)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                    ${isDisabled || isNotInscribed
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
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
                    <Check className="h-4 w-4 absolute top-1 right-1 text-blue-600" />
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
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Comunicar baja</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}