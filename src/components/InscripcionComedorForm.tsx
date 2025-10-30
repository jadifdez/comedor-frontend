import React, { useState } from 'react';
import { Calendar, User, Send, Check, GraduationCap, Utensils, Euro } from 'lucide-react';
import { Hijo, InscripcionComedor } from '../lib/supabase';
import { useConfiguracionPrecios } from '../hooks/useConfiguracionPrecios';

interface InscripcionComedorFormData {
  hijoId: string;
  diasSemana: number[];
  fechaInicio: string;
}

interface InscripcionComedorFormProps {
  onSubmit: (data: InscripcionComedorFormData) => void;
  hijos: Hijo[];
  inscripciones: InscripcionComedor[];
  isSubmitting?: boolean;
}

const diasSemanaOptions = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
];

export function InscripcionComedorForm({ onSubmit, hijos, inscripciones, isSubmitting = false }: InscripcionComedorFormProps) {
  const { getPrecioPorDias, configuraciones, loading: loadingPrecios } = useConfiguracionPrecios();

  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState<InscripcionComedorFormData>({
    hijoId: '',
    diasSemana: [],
    fechaInicio: today
  });

  // Función para verificar si un hijo ya tiene inscripción activa
  const tieneInscripcionActiva = (hijoId: string) => {
    return inscripciones.some(i => i.hijo_id === hijoId && i.activo);
  };

  // Filtrar hijos que no tienen inscripción activa
  const hijosDisponibles = hijos.filter(hijo => !tieneInscripcionActiva(hijo.id));

  // Si todos los hijos están inscritos, no mostrar nada
  if (hijosDisponibles.length === 0 && hijos.length > 0) {
    return null;
  }

  const handleDiaToggle = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hijoId || formData.diasSemana.length === 0 || !formData.fechaInicio) return;

    onSubmit(formData);
    setFormData({ hijoId: '', diasSemana: [], fechaInicio: today });
  };

  const calcularPrecio = (diasCount: number) => {
    return getPrecioPorDias(diasCount);
  };

  const calcularPrecioSemanal = (diasCount: number) => {
    return diasCount * calcularPrecio(diasCount);
  };

  const calcularPrecioMensual = (diasCount: number) => {
    const precioSemanal = calcularPrecioSemanal(diasCount);
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  const isFormValid = formData.hijoId && formData.diasSemana.length > 0 && formData.fechaInicio;
  const selectedHijo = hijos.find(h => h.id === formData.hijoId);
  const diasCount = formData.diasSemana.length;
  const precioUnitario = (loadingPrecios || diasCount === 0) ? 0 : calcularPrecio(diasCount);
  const precioSemanal = (loadingPrecios || diasCount === 0) ? 0 : calcularPrecioSemanal(diasCount);
  const precioMensual = (loadingPrecios || diasCount === 0) ? 0 : calcularPrecioMensual(diasCount);

  // Verificar si el hijo ya tiene inscripción activa
  const inscripcionExistente = inscripciones.find(i => 
    i.hijo_id === formData.hijoId && i.activo
  );

  // Obtener fecha mínima (mañana)
  const minDate = today;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Utensils className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Inscribir al comedor
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de hijo */}
        <div>
          <label htmlFor="hijoId" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <User className="h-4 w-4" />
            <span>Seleccionar hijo/a</span>
          </label>
          <select
            id="hijoId"
            value={formData.hijoId}
            onChange={(e) => {
              const hijoId = e.target.value;
              setFormData(prev => ({ ...prev, hijoId, diasSemana: [] }));
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
            disabled={hijosDisponibles.length === 0}
          >
            <option value="">Selecciona un hijo/a...</option>
            {hijosDisponibles.map((hijo) => (
              <option key={hijo.id} value={hijo.id}>
                {hijo.nombre} - {hijo.grado?.nombre}
              </option>
            ))}
          </select>
          
          {/* Mostrar hijos ya inscritos como información */}
          {hijos.length > hijosDisponibles.length && (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium mb-1">Hijos ya inscritos:</p>
              <div className="space-y-1">
                {hijos.filter(hijo => tieneInscripcionActiva(hijo.id)).map((hijo) => {
                  const inscripcion = inscripciones.find(i => i.hijo_id === hijo.id && i.activo);
                  return (
                    <div key={hijo.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span>{hijo.nombre} - {hijo.grado?.nombre}</span>
                      <span className="text-xs text-green-600 font-medium">
                        {inscripcion?.dias_semana.length} días/semana
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fecha de inicio del servicio */}
        {formData.hijoId && (
          <div>
            <label htmlFor="fechaInicio" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4" />
              <span>Fecha de inicio del servicio</span>
            </label>
            <input
              id="fechaInicio"
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaInicio: e.target.value }))}
              min={minDate}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Selecciona el primer día que quieres que tu hijo/a coma en el comedor (por defecto: hoy)</p>
          </div>
        )}

        {/* Selección de días - solo mostrar si hay hijo seleccionado */}
        {formData.hijoId && (
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4" />
            <span>Días de la semana</span>
          </label>
          <div className="grid grid-cols-5 gap-3">
            {diasSemanaOptions.map((dia) => {
              const isSelected = formData.diasSemana.includes(dia.value);
              
              return (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => handleDiaToggle(dia.value)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-bold text-lg">{dia.short}</span>
                  <span className="text-xs text-center">{dia.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 absolute top-1 right-1 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        )}


        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting || hijosDisponibles.length === 0}
          className={`
            w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
            ${isFormValid && !isSubmitting && hijosDisponibles.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Inscribir al comedor</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}