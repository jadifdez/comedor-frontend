import React, { useState, useEffect } from 'react';
import { Calendar, Send, Check, X, Utensils, Euro, User } from 'lucide-react';
import { useConfiguracionPrecios } from '../../hooks/useConfiguracionPrecios';
import { Padre } from '../../lib/supabase';

interface InscribirProfesorModalProps {
  profesor: Padre;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (diasSemana: number[], fechaInicio: string) => Promise<{ success: boolean; error?: string }>;
}

const diasSemanaOptions = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
];

export function InscribirProfesorModal({
  profesor,
  onClose,
  onSuccess,
  onSubmit
}: InscribirProfesorModalProps) {
  const { configuraciones, loading: loadingPrecios } = useConfiguracionPrecios();
  const today = new Date().toISOString().split('T')[0];

  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiaToggle = (dia: number) => {
    setDiasSemana(prev =>
      prev.includes(dia)
        ? prev.filter(d => d !== dia)
        : [...prev, dia].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diasSemana.length === 0 || !fechaInicio) return;

    setIsSubmitting(true);
    setError(null);

    const result = await onSubmit(diasSemana, fechaInicio);

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Error al crear la inscripción');
    }
  };

  const precioAdulto = configuraciones[0]?.precio_adulto || 0;

  const calcularPrecioSemanal = (diasCount: number) => {
    return diasCount * precioAdulto;
  };

  const calcularPrecioMensual = (diasCount: number) => {
    const precioSemanal = calcularPrecioSemanal(diasCount);
    return Math.round(precioSemanal * 4.33 * 100) / 100;
  };

  const isFormValid = diasSemana.length > 0 && fechaInicio;
  const diasCount = diasSemana.length;
  const precioSemanal = loadingPrecios ? 0 : calcularPrecioSemanal(diasCount);
  const precioMensual = loadingPrecios ? 0 : calcularPrecioMensual(diasCount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Utensils className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Inscribir profesor al comedor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <User className="h-4 w-4" />
              <span>Profesor</span>
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="font-medium text-gray-900">{profesor.nombre}</div>
              <div className="text-sm text-gray-600">{profesor.email}</div>
            </div>
          </div>

          <div>
            <label htmlFor="fechaInicio" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4" />
              <span>Fecha de inicio del servicio</span>
            </label>
            <input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              min={today}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Selecciona el primer día que el profesor comerá en el comedor
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4" />
              <span>Días de la semana</span>
            </label>
            <div className="grid grid-cols-5 gap-3">
              {diasSemanaOptions.map((dia) => {
                const isSelected = diasSemana.includes(dia.value);

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

          {diasCount > 0 && fechaInicio && !loadingPrecios && (
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
                * El servicio comenzará el {new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
                })}
              </div>
              <div className="mt-1 text-xs text-blue-600">
                * Precio fijo para personal. No aplican descuentos.
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting || loadingPrecios}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200
                ${isFormValid && !isSubmitting && !loadingPrecios
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
          </div>
        </form>
      </div>
    </div>
  );
}
