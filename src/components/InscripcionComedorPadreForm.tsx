import React, { useState } from 'react';
import { Calendar, Send, Check, Utensils, Euro, User } from 'lucide-react';
import { useConfiguracionPrecios } from '../hooks/useConfiguracionPrecios';

interface InscripcionPadreFormData {
  diasSemana: number[];
  fechaInicio: string;
}

interface InscripcionComedorPadreFormProps {
  onSubmit: (data: InscripcionPadreFormData) => void;
  hasActiveInscripcion: boolean;
  isSubmitting?: boolean;
  nombrePadre: string;
}

const diasSemanaOptions = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
];

export function InscripcionComedorPadreForm({
  onSubmit,
  hasActiveInscripcion,
  isSubmitting = false,
  nombrePadre
}: InscripcionComedorPadreFormProps) {
  const { configuraciones, loading: loadingPrecios } = useConfiguracionPrecios();

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<InscripcionPadreFormData>({
    diasSemana: [],
    fechaInicio: today
  });

  // Si ya tiene inscripción activa, no mostrar formulario
  if (hasActiveInscripcion) {
    return null;
  }

  // Validar que exista configuración de precios
  if (!loadingPrecios && configuraciones.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
        No hay configuración de precios disponible. Por favor, configure los precios en el panel de administración.
      </div>
    );
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
    if (formData.diasSemana.length === 0 || !formData.fechaInicio) return;

    onSubmit(formData);
    setFormData({ diasSemana: [], fechaInicio: today });
  };

  // Obtener precio para adultos desde la configuración
  const precioAdulto = configuraciones[0]?.precio_adulto;

  const calcularPrecioSemanal = (diasCount: number) => {
    return diasCount * precioAdulto;
  };

  const calcularPrecioMensual = (diasCount: number) => {
    const precioSemanal = calcularPrecioSemanal(diasCount);
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  const isFormValid = formData.diasSemana.length > 0 && formData.fechaInicio;
  const diasCount = formData.diasSemana.length;
  const precioSemanal = loadingPrecios ? 0 : calcularPrecioSemanal(diasCount);
  const precioMensual = loadingPrecios ? 0 : calcularPrecioMensual(diasCount);

  const minDate = today;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Utensils className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Inscribirme al comedor (Personal)
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre del padre */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
            <User className="h-4 w-4" />
            <span>Inscripción para</span>
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
            <span className="font-medium text-gray-900">{nombrePadre}</span>
          </div>
        </div>

        {/* Fecha de inicio del servicio */}
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
          <p className="mt-1 text-xs text-gray-500">Selecciona el primer día que quieres comer en el comedor</p>
        </div>

        {/* Selección de días */}
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

        {/* Información de precios */}
        {diasCount > 0 && formData.fechaInicio && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Euro className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Cálculo de precios</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Días seleccionados:</span>
                <span className="font-semibold text-blue-900">{diasCount} días</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Precio por día (personal):</span>
                <span className="font-semibold text-blue-900">{precioAdulto.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Precio semanal:</span>
                <span className="font-semibold text-blue-900">{precioSemanal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-2">
                <span className="text-blue-700 font-medium">Precio mensual aproximado:</span>
                <span className="font-bold text-blue-900 text-lg">{precioMensual.toFixed(2)}€</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-blue-600">
              * El servicio comenzará el {new Date(formData.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
              })}
            </div>
            <div className="mt-1 text-xs text-blue-600">
              * Precio fijo para personal. No aplican descuentos.
            </div>
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
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Inscribirme al comedor</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}