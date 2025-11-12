import React, { useState } from 'react';
import { Calendar, User, Send, Check, GraduationCap, ChefHat, Utensils, AlertTriangle } from 'lucide-react';
import { Hijo, OpcionMenuPrincipal, OpcionMenuGuarnicion, EleccionMenu, InscripcionComedor, SolicitudComida } from '../lib/supabase';
import { InscripcionPadre } from '../hooks/useInscripcionesPadres';
import { getNext10WorkDays } from '../utils/dateUtils';

interface MenuEleccionFormData {
  hijoId: string;
  fecha: string;
  opcionPrincipalId: string;
  opcionGuarnicionId: string;
}

interface OpcionUnificada {
  id: string;
  nombre: string;
  detalle?: string;
  tipo: 'hijo' | 'padre';
}

interface MenuEleccionFormProps {
  onSubmit: (data: MenuEleccionFormData) => void;
  personasUnificadas: OpcionUnificada[];
  opcionesGuarnicion: OpcionMenuGuarnicion[];
  getOpcionesPorDia: (diaSemana: number) => OpcionMenuPrincipal[];
  elecciones: EleccionMenu[];
  inscripciones: InscripcionComedor[];
  inscripcionesPadre?: InscripcionPadre[];
  solicitudes?: SolicitudComida[];
  padreId?: string;
  isSubmitting?: boolean;
  diasAntelacion?: number;
}

export function MenuEleccionForm({
  onSubmit,
  personasUnificadas,
  opcionesGuarnicion,
  getOpcionesPorDia,
  elecciones,
  inscripciones,
  inscripcionesPadre = [],
  solicitudes = [],
  padreId = '',
  isSubmitting = false,
  diasAntelacion = 2
}: MenuEleccionFormProps) {
  const [diasDisponibles, setDiasDisponibles] = useState<any[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  
  const [formData, setFormData] = useState<MenuEleccionFormData>({
    hijoId: '',
    fecha: '',
    opcionPrincipalId: '',
    opcionGuarnicionId: ''
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

  // Obtener la inscripción activa del hijo seleccionado
  const getInscripcionActiva = (hijoId: string) => {
    return inscripciones.find(i => i.hijo_id === hijoId && i.activo);
  };

  // Convertir fecha dd/mm/yyyy a YYYY-MM-DD
  const convertirFechaISO = (fechaDDMMYYYY: string): string => {
    const partes = fechaDDMMYYYY.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`; // YYYY-MM-DD
    }
    return fechaDDMMYYYY; // Si ya está en otro formato, devolverlo tal cual
  };

  // Verificar si un día está disponible para elección de menú (persona inscrita ese día O con solicitud puntual)
  const isDayAvailableForMenu = (fechaId: string, personaId: string) => {
    const date = new Date(fechaId + 'T00:00:00');
    const diaSemana = date.getDay(); // 0=domingo, 1=lunes, etc.

    // Verificar si es el padre o un hijo
    const isPadre = padreId === personaId;

    // Primero verificar si hay una solicitud puntual para este día
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
      const tieneInscripcionPadre = inscripcionesPadre?.some(inscripcion =>
        inscripcion.activo &&
        inscripcion.dias_semana.includes(diaSemana)
      );
      return tieneInscripcionPadre || false;
    } else {
      // Para hijos, verificar inscripciones de comedor
      const inscripcion = getInscripcionActiva(personaId);
      if (!inscripcion) return false;
      return inscripcion.dias_semana.includes(diaSemana);
    }
  };

  const isDayDisabled = (fechaId: string) => {
    if (!formData.hijoId) return false;

    // No disponible si la persona no está inscrita ese día
    if (!isDayAvailableForMenu(fechaId, formData.hijoId)) return true;

    // No disponible si ya tiene elección para esta fecha
    return elecciones.some(eleccion =>
      (eleccion.hijo_id === formData.hijoId || eleccion.padre_id === formData.hijoId) &&
      eleccion.fecha === fechaId
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hijoId || !formData.fecha || !formData.opcionPrincipalId || !formData.opcionGuarnicionId) return;
    
    onSubmit(formData);
    setFormData({ 
      hijoId: '', 
      fecha: '', 
      opcionPrincipalId: '', 
      opcionGuarnicionId: '' 
    });
  };

  const isFormValid = formData.hijoId && formData.fecha && formData.opcionPrincipalId && formData.opcionGuarnicionId;
  const selectedPersona = personasUnificadas.find(p => p.id === formData.hijoId);
  const selectedDate = diasDisponibles.find(d => d.id === formData.fecha);
  const opcionesPrincipales = selectedDate ? getOpcionesPorDia(selectedDate.diaSemana) : [];
  const inscripcionActiva = formData.hijoId && selectedPersona?.tipo === 'hijo' ? getInscripcionActiva(formData.hijoId) : null;

  // Reset opciones cuando cambia la fecha
  const handleFechaChange = (fecha: string) => {
    // No permitir seleccionar fechas que ya tienen elecciones
    if (isDayDisabled(fecha)) return;

    setFormData(prev => ({
      ...prev,
      fecha,
      opcionPrincipalId: '', // Reset principal option when date changes
    }));
  };

  // Si no hay personas con inscripciones activas, mostrar mensaje informativo
  if (personasUnificadas.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ChefHat className="h-6 w-6 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Elegir menú semanal</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                No hay inscripciones activas
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Para poder elegir el menú semanal, necesitas tener una inscripción activa al comedor.
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Si eres padre/madre: debes tener hijos con inscripción activa al comedor</li>
                <li>Si eres personal del colegio: debes inscribirte en la sección de "Inscripción al Comedor"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <ChefHat className="h-6 w-6 text-orange-600" />
        <h2 className="text-xl font-semibold text-gray-900">Elegir menú semanal</h2>
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
            onChange={(e) => setFormData(prev => ({ ...prev, hijoId: e.target.value, fecha: '', opcionPrincipalId: '', opcionGuarnicionId: '' }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            required
          >
            <option value="">Selecciona una persona...</option>
            {personasUnificadas.map((persona) => (
              <option key={`${persona.tipo}-${persona.id}`} value={persona.id}>
                {persona.nombre}{persona.detalle ? ` - ${persona.detalle}` : ''}
              </option>
            ))}
          </select>
        </div>


        {/* Mensaje si no tiene inscripción (solo para hijos) */}
        {formData.hijoId && selectedPersona?.tipo === 'hijo' && !inscripcionActiva && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                  Sin inscripción al comedor
                </h4>
                <p className="text-sm text-yellow-700">
                  {selectedPersona?.nombre} no tiene una inscripción activa al comedor.
                  Debe estar inscrito para poder elegir menú.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Selección de día */}
        {formData.hijoId && (
        <div>
          {loadingDays ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-600 border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">Cargando días disponibles...</span>
            </div>
          ) : (
            <>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Próximos días laborables para elegir menú
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
            {diasDisponibles.map((dia) => {
              const isDisabled = isDayDisabled(dia.id);
              const isNotInscribed = !isDayAvailableForMenu(dia.id, formData.hijoId);
              const isSelected = formData.fecha === dia.id;
              
              return (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => handleFechaChange(dia.id)}
                  disabled={isDisabled}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                    ${isDisabled || isNotInscribed
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
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
                    <Check className="h-4 w-4 absolute top-1 right-1 text-orange-600" />
                  )}
                </button>
              );
            })}
          </div>
            </>
          )}
        </div>
        )}

        {/* Selección de plato principal */}
        {formData.fecha && (
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <Utensils className="h-4 w-4" />
              <span>Plato principal</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {opcionesPrincipales.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, opcionPrincipalId: opcion.id }))}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-center
                    ${formData.opcionPrincipalId === opcion.id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-medium">{opcion.nombre}</span>
                  {formData.opcionPrincipalId === opcion.id && (
                    <Check className="h-4 w-4 mx-auto mt-2 text-orange-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selección de guarnición */}
        {formData.opcionPrincipalId && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Guarnición
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {opcionesGuarnicion.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, opcionGuarnicionId: opcion.id }))}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-center
                    ${formData.opcionGuarnicionId === opcion.id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-medium">{opcion.nombre}</span>
                  {formData.opcionGuarnicionId === opcion.id && (
                    <Check className="h-4 w-4 mx-auto mt-2 text-orange-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Información adicional */}
        {isFormValid && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Resumen:</strong> {selectedPersona?.nombre} - {selectedDate?.nombre}<br/>
              <strong>Menú:</strong> {opcionesPrincipales.find(o => o.id === formData.opcionPrincipalId)?.nombre} con {opcionesGuarnicion.find(o => o.id === formData.opcionGuarnicionId)?.nombre}
            </p>
          </div>
        )}

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`
            w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isFormValid && !isSubmitting
              ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Guardando elección...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Guardar elección de menú</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}