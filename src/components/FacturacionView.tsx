import React, { useState, useEffect, useMemo } from 'react';
import { Euro, Calendar, User, FileText, AlertCircle, CheckCircle, XCircle, TrendingDown, Gift, Users, Award, Info, HelpCircle, Percent, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useFacturacion } from '../hooks/useFacturacion';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { FacturacionCalendario } from './FacturacionCalendario';

interface FacturacionViewProps {
  user: SupabaseUser;
}

export function FacturacionView({ user }: FacturacionViewProps) {
  const { facturacion, loading, error, mesSeleccionado, setMesSeleccionado } = useFacturacion(user);
  const [showInfoDescuentos, setShowInfoDescuentos] = useState(false);
  const [configuracionPrecios, setConfiguracionPrecios] = useState<any>(null);
  const [calendarioExpandido, setCalendarioExpandido] = useState<string | null>(null);

  // Extraer mes y año del mesSeleccionado
  const [year, month] = mesSeleccionado.split('-').map(Number);

  // Generar años disponibles (desde 2023 hasta el año siguiente)
  const generarYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2023; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  };

  const availableYears = generarYears();

  const handleMonthChange = (newMonth: number) => {
    setMesSeleccionado(`${year}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleYearChange = (newYear: number) => {
    setMesSeleccionado(`${newYear}-${String(month).padStart(2, '0')}`);
  };

  useEffect(() => {
    const loadConfiguracion = async () => {
      const { data } = await supabase
        .from('configuracion_precios')
        .select('descuento_tercer_hijo, descuento_asistencia_80, umbral_asistencia_descuento, precio, precio_adulto, precio_hijo_personal')
        .eq('activo', true)
        .maybeSingle();

      if (data) {
        setConfiguracionPrecios(data);
      }
    };
    loadConfiguracion();
  }, []);


  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Calculando facturación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Error al cargar la facturación</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!facturacion) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos de facturación</h3>
        <p className="text-gray-600">No se encontraron datos para el mes seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Euro className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Facturación del Comedor</h2>
          </div>
        </div>

        {/* Selector de mes y año */}
        <div className="flex items-center space-x-4 mb-6">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            <span>Periodo a consultar:</span>
          </label>
          <div className="flex items-center space-x-2">
            <select
              value={month}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>
            <span className="text-gray-500 font-medium">de</span>
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Total a facturar</p>
                <p className="text-2xl font-bold text-green-900">{facturacion.totalGeneral.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          {facturacion.ahorroTotalDescuentos > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Ahorro total</p>
                  <p className="text-2xl font-bold text-orange-900">{facturacion.ahorroTotalDescuentos.toFixed(2)}€</p>
                  <p className="text-xs text-orange-700">
                    Precio sin descuentos: {facturacion.totalSinDescuentos.toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total días</p>
                <p className="text-2xl font-bold text-blue-900">{facturacion.totalDias}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Hijos con servicio</p>
                <p className="text-2xl font-bold text-purple-900">
                  {facturacion.hijosFacturacion.filter(h => h.totalDias > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Informativa de Descuentos */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
        <button
          onClick={() => setShowInfoDescuentos(!showInfoDescuentos)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">¿Cómo funcionan los descuentos?</h3>
              <p className="text-sm text-gray-600">Haz clic para ver información detallada sobre los descuentos aplicables</p>
            </div>
          </div>
          {showInfoDescuentos ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {showInfoDescuentos && configuracionPrecios && (
          <div className="mt-6 space-y-6">
            {/* Introducción */}
            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Transparencia en la facturación</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    En el colegio queremos que las familias comprendan claramente cómo se calcula el precio del servicio de comedor.
                    A continuación, encontrarás información detallada sobre los diferentes tipos de descuentos que pueden aplicarse automáticamente a tu facturación.
                  </p>
                </div>
              </div>
            </div>

            {/* Descuento por Familia Numerosa */}
            <div className="bg-white rounded-lg p-5 border-l-4 border-green-500">
              <div className="flex items-start space-x-3 mb-3">
                <Users className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">Descuento por Familia Numerosa</h4>
                  <div className="mt-1 inline-flex items-center bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    <Percent className="h-4 w-4 mr-1" />
                    {configuracionPrecios.descuento_tercer_hijo}% de descuento
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-medium text-green-900 mb-2">¿Cuándo se aplica?</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>A partir del <strong>tercer hijo inscrito</strong> en el servicio de comedor</li>
                    <li>Se aplica automáticamente si tienes 3 o más hijos con inscripción activa</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">¿Cómo se determina el orden de los hijos?</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Se ordenan los hijos por el <strong>coste total mensual</strong> (precio × días/semana)</li>
                    <li>Los dos hijos con mayor coste pagan el <strong>precio completo</strong></li>
                    <li>Del tercer hijo en adelante se aplica el <strong>descuento del {configuracionPrecios.descuento_tercer_hijo}%</strong></li>
                  </ol>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium text-blue-900 mb-2">Ejemplo práctico:</p>
                  <div className="space-y-1 text-sm">
                    <p>Si tienes 3 hijos inscritos:</p>
                    <p>• Hijo 1 (5 días/semana): Paga precio completo</p>
                    <p>• Hijo 2 (5 días/semana): Paga precio completo</p>
                    <p>• Hijo 3 (4 días/semana): Paga con {configuracionPrecios.descuento_tercer_hijo}% de descuento</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Descuento por Asistencia */}
            <div className="bg-white rounded-lg p-5 border-l-4 border-blue-500">
              <div className="flex items-start space-x-3 mb-3">
                <Award className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">Descuento por Asistencia Regular</h4>
                  <div className="mt-1 inline-flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                    <Percent className="h-4 w-4 mr-1" />
                    {configuracionPrecios.descuento_asistencia_80}% de descuento
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium text-blue-900 mb-2">¿Cuándo se aplica?</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Cuando asistes al número mínimo de días requeridos ese mes (calculado como días laborables × {configuracionPrecios.umbral_asistencia_descuento}%)</li>
                    <li>Se calcula al final de cada mes basándose en tu asistencia real</li>
                    <li>Es compatible con otros descuentos (se aplican de forma acumulativa)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">¿Cómo se calcula el umbral de días requeridos?</p>
                  <div className="space-y-3">
                    <div className="bg-white border border-gray-200 rounded p-3">
                      <p className="font-medium text-center text-gray-900">
                        El número de días requeridos se calcula aplicando el {configuracionPrecios.umbral_asistencia_descuento}% sobre los días laborables del mes
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p><strong>Días laborables del mes:</strong> Todos los días que el comedor está abierto</p>
                      <p className="text-xs text-gray-600 ml-4">
                        Se cuentan todos los días laborables (lunes a viernes) del mes, excluyendo festivos
                      </p>

                      <p><strong>Días asistidos:</strong> Los días que realmente has asistido al comedor</p>
                      <p className="text-xs text-gray-600 ml-4">
                        Se cuentan: días de inscripción + comidas puntuales<br />
                        NO se cuentan: días con baja comunicada o invitaciones
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-medium text-green-900 mb-2">Ejemplo práctico (Octubre 2024):</p>
                  <div className="space-y-2 text-sm">
                    <p>Octubre 2024 tiene <strong>23 días laborables</strong> en total.</p>
                    <p className="font-medium mt-2">Para obtener el descuento del {configuracionPrecios.descuento_asistencia_80}%, necesitas asistir al menos:</p>
                    <p className="ml-4 text-lg font-bold text-green-700">19 días (el {configuracionPrecios.umbral_asistencia_descuento}% de 23 días laborables)</p>

                    <div className="mt-3 space-y-2 border-t border-green-200 pt-3">
                      <p className="font-medium">Ejemplos según tu inscripción:</p>
                      <div className="space-y-2">
                        <div className="bg-white rounded p-2">
                          <p className="font-medium">Inscrito 5 días/semana:</p>
                          <p className="text-xs ml-4">23 días posibles → Si asiste 23 días = 100% ✅</p>
                          <p className="text-xs ml-4">23 días posibles → Si asiste 19 días = 82.6% ✅</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="font-medium">Inscrito 4 días/semana (19 días):</p>
                          <p className="text-xs ml-4">Asiste sus 19 días = 82.6% ✅</p>
                          <p className="text-xs ml-4">Puede faltar máximo 1 día (18 días) = 78.3% ❌</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="font-medium">Inscrito 1 día/semana (4-5 días):</p>
                          <p className="text-xs ml-4">Asiste sus 5 días = 21.7% ❌</p>
                          <p className="text-xs ml-4 text-blue-700">Debería solicitar comidas puntuales hasta alcanzar 19 días para obtener el descuento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 mb-1">Importante:</p>
                      <p className="text-sm text-yellow-800">
                        El porcentaje se calcula sobre <strong>todos los días laborables del mes</strong>, no solo tus días inscritos.
                        Esto significa que quien asiste más días al comedor (sin importar su inscripción) obtiene el descuento.
                        Puedes aumentar tu asistencia solicitando comidas puntuales en los días que no estés inscrito.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Combinación de Descuentos */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-5 border-2 border-green-300">
              <div className="flex items-start space-x-3 mb-3">
                <Gift className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">¿Los descuentos se pueden combinar?</h4>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-700">
                <p className="font-medium">Sí, los descuentos se aplican de forma acumulativa en este orden:</p>

                <ol className="space-y-3 list-decimal list-inside">
                  <li className="ml-2">
                    <strong>Primero:</strong> Se aplica el descuento por familia numerosa ({configuracionPrecios.descuento_tercer_hijo}%)
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Si corresponde (tercer hijo o siguientes)
                    </p>
                  </li>

                  <li className="ml-2">
                    <strong>Segundo:</strong> Se aplica el descuento por asistencia ({configuracionPrecios.descuento_asistencia_80}%)
                    <p className="text-xs text-gray-600 ml-6 mt-1">
                      Si asistes al número mínimo de días requeridos ese mes (días laborables × {configuracionPrecios.umbral_asistencia_descuento}%, redondeado hacia arriba)
                    </p>
                  </li>
                </ol>

                <div className="bg-white border border-green-300 rounded-lg p-4 mt-4">
                  <p className="font-medium text-green-900 mb-2">Ejemplo de máximo ahorro:</p>
                  <div className="space-y-1 text-sm">
                    <p>Tercer hijo, cumpliendo el umbral de asistencia ({configuracionPrecios.umbral_asistencia_descuento}%):</p>
                    <p className="ml-4">• Precio base: {configuracionPrecios.precio.toFixed(2)}€/día</p>
                    <p className="ml-4">• Con descuento familia: {(configuracionPrecios.precio * (1 - configuracionPrecios.descuento_tercer_hijo / 100)).toFixed(2)}€/día</p>
                    <p className="ml-4">• Con descuento asistencia adicional: {(configuracionPrecios.precio * (1 - configuracionPrecios.descuento_tercer_hijo / 100) * (1 - configuracionPrecios.descuento_asistencia_80 / 100)).toFixed(2)}€/día</p>
                    <p className="mt-2 font-semibold text-green-700">
                      Ahorro total: {(configuracionPrecios.precio - (configuracionPrecios.precio * (1 - configuracionPrecios.descuento_tercer_hijo / 100) * (1 - configuracionPrecios.descuento_asistencia_80 / 100))).toFixed(2)}€/día
                      ({((1 - ((1 - configuracionPrecios.descuento_tercer_hijo / 100) * (1 - configuracionPrecios.descuento_asistencia_80 / 100))) * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nota Final */}
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">Notas importantes:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Todos los descuentos se aplican <strong>automáticamente</strong></li>
                    <li>No es necesario solicitar los descuentos, el sistema los calcula en tiempo real</li>
                    <li>Puedes ver el desglose detallado en tu facturación mensual</li>
                    <li>El descuento por asistencia se calcula al final de cada mes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen Total */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 rounded-full p-2">
              <Euro className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Resumen Total del Mes</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
            <p className="text-3xl font-bold text-green-600">
              {facturacion.totalGeneral.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Días</p>
            <p className="text-3xl font-bold text-blue-600">
              {facturacion.totalDias}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Sin Descuentos</p>
            <p className="text-2xl font-bold text-gray-700">
              {facturacion.totalSinDescuentos.toFixed(2)}€
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Ahorrado</p>
            <p className="text-3xl font-bold text-green-600">
              {facturacion.ahorroTotalDescuentos.toFixed(2)}€
            </p>
            {facturacion.ahorroTotalDescuentos > 0 && (
              <p className="text-xs text-green-700 mt-1">
                {((facturacion.ahorroTotalDescuentos / facturacion.totalSinDescuentos) * 100).toFixed(1)}% de descuento
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {facturacion.hijosFacturacion.map((hijoFacturacion) => (
            <div key={hijoFacturacion.hijo.id} className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">{hijoFacturacion.hijo.nombre}</p>
              <p className="text-lg font-bold text-gray-900">
                {hijoFacturacion.totalImporte.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500">
                {hijoFacturacion.totalDias} días
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de hijos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Detalle por Hijo</h3>

        {facturacion.hijosFacturacion.map((hijoFacturacion) => (
          <div key={hijoFacturacion.hijo.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="h-5 w-5 text-gray-500" />
                <h4 className="text-lg font-semibold text-gray-900">
                  {hijoFacturacion.hijo.nombre}
                </h4>
                <span className="text-sm text-gray-600">
                  ({hijoFacturacion.hijo.grado?.nombre})
                </span>
                {hijoFacturacion.estaExento && (
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium" title={hijoFacturacion.motivoExencion}>
                    <Shield className="h-3 w-3 mr-1" />
                    EXENTO
                  </span>
                )}
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <p className="text-xs font-medium text-green-800">Inscrito</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {hijoFacturacion.desglose.diasInscripcion}
                  </p>
                  <p className="text-xs text-green-600 mt-1">días según calendario</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs font-medium text-yellow-800">Festivos</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">
                    {hijoFacturacion.desglose.diasFestivos}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">en tu inscripción</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-medium text-blue-800">Puntuales</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {hijoFacturacion.desglose.diasPuntuales}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">días extras</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <p className="text-xs font-medium text-red-800">Cancelaciones</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {hijoFacturacion.desglose.diasBaja}
                  </p>
                  <p className="text-xs text-red-600 mt-1">días de baja</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <p className="text-xs font-medium text-purple-800">Invitaciones</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">
                    {hijoFacturacion.desglose.diasInvitacion}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">días invitado</p>
                </div>
              </div>

                  {/* Badges de descuentos aplicados */}
                  {(hijoFacturacion.tieneDescuentoFamiliaNumerosa || hijoFacturacion.tieneDescuentoAsistencia80 || hijoFacturacion.esHijoDePersonal) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {hijoFacturacion.esHijoDePersonal && (
                        <div className="flex items-center space-x-1 bg-blue-100 border border-blue-300 rounded-full px-3 py-1">
                          <Award className="h-4 w-4 text-blue-700" />
                          <span className="text-xs font-medium text-blue-800">Hijo de Personal</span>
                        </div>
                      )}
                      {hijoFacturacion.tieneDescuentoFamiliaNumerosa && (
                        <div className="flex items-center space-x-1 bg-green-100 border border-green-300 rounded-full px-3 py-1">
                          <Users className="h-4 w-4 text-green-700" />
                          <span className="text-xs font-medium text-green-800">
                            Familia numerosa - {hijoFacturacion.porcentajeDescuento}% (Hijo #{hijoFacturacion.posicionHijo})
                          </span>
                        </div>
                      )}
                      {hijoFacturacion.tieneDescuentoAsistencia80 && (
                        <div className="flex items-center space-x-1 bg-green-100 border border-green-300 rounded-full px-3 py-1">
                          <CheckCircle className="h-4 w-4 text-green-700" />
                          <span className="text-xs font-medium text-green-800">
                            Asistencia {hijoFacturacion.porcentajeDescuentoAsistencia80}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desglose detallado de precios y calendario */}
                  {hijoFacturacion.totalDias > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-4 mb-3">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-gray-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <Euro className="h-5 w-5 text-blue-600" />
                          <h5 className="font-semibold text-gray-900">Resumen de facturación</h5>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">Días facturables:</span>
                            <span className="text-sm font-medium text-gray-900">{hijoFacturacion.totalDias} días</span>
                          </div>
                          {hijoFacturacion.ahorroTotalDescuentos > 0 ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700">Precio sin descuentos:</span>
                                <span className="text-sm font-medium text-gray-900">{hijoFacturacion.precioBaseSinDescuentos?.toFixed(2)}€</span>
                              </div>
                              {hijoFacturacion.inscripcion && 'descuento_aplicado' in hijoFacturacion.inscripcion && hijoFacturacion.inscripcion.descuento_aplicado > 0 && (
                                <div className="flex justify-between items-center text-green-700">
                                  <span className="text-sm flex items-center space-x-1">
                                    <Users className="h-3 w-3" />
                                    <span>Descuento familia numerosa ({hijoFacturacion.inscripcion.descuento_aplicado}%):</span>
                                  </span>
                                  <span className="text-sm font-medium">-{((hijoFacturacion.precioBaseSinDescuentos || 0) * (hijoFacturacion.inscripcion.descuento_aplicado / 100)).toFixed(2)}€</span>
                                </div>
                              )}
                              {hijoFacturacion.tieneDescuentoAsistencia80 && !hijoFacturacion.estaExento && (
                                <>
                                  <div className="flex justify-between items-center border-t pt-2">
                                    <span className="text-sm text-gray-700">Subtotal:</span>
                                    <span className="text-sm font-medium text-gray-900">{hijoFacturacion.totalImporteSinDescuento?.toFixed(2)}€</span>
                                  </div>
                                  <div className="flex justify-between items-center text-green-700">
                                    <span className="text-sm flex items-center space-x-1">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Descuento asistencia {hijoFacturacion.porcentajeAsistencia?.toFixed(0)}% ({hijoFacturacion.porcentajeDescuentoAsistencia80}%):</span>
                                    </span>
                                    <span className="text-sm font-medium">-{((hijoFacturacion.totalImporteSinDescuento || 0) * ((hijoFacturacion.porcentajeDescuentoAsistencia80 || 0) / 100)).toFixed(2)}€</span>
                                  </div>
                                </>
                              )}
                              {hijoFacturacion.estaExento && (
                                <>
                                  <div className="flex justify-between items-center border-t pt-2">
                                    <span className="text-sm text-gray-700">Importe teórico:</span>
                                    <span className="text-sm font-medium text-gray-500 line-through">{hijoFacturacion.totalImporteSinDescuento?.toFixed(2)}€</span>
                                  </div>
                                  <div className="flex justify-between items-center text-green-700 bg-green-50 rounded px-2 py-1">
                                    <span className="text-sm font-medium flex items-center space-x-1">
                                      <Shield className="h-4 w-4" />
                                      <span>Exención de facturación (100%):</span>
                                    </span>
                                    <span className="text-sm font-bold">-{hijoFacturacion.totalImporteSinDescuento?.toFixed(2)}€</span>
                                  </div>
                                  {hijoFacturacion.motivoExencion && (
                                    <div className="text-xs text-gray-600 italic mt-1">
                                      Motivo: {hijoFacturacion.motivoExencion}
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="flex justify-between items-center border-t-2 border-blue-300 pt-2 mt-2">
                                <span className="text-base font-semibold text-gray-900">Total a facturar:</span>
                                <span className={`text-lg font-bold ${hijoFacturacion.estaExento ? 'text-green-600' : 'text-blue-600'}`}>
                                  {hijoFacturacion.totalImporte.toFixed(2)}€
                                  {hijoFacturacion.estaExento && ' (EXENTO)'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-green-100 rounded px-2 py-1">
                                <span className="text-sm font-medium text-green-800">Ahorro total:</span>
                                <span className="text-sm font-bold text-green-900">{hijoFacturacion.ahorroTotalDescuentos.toFixed(2)}€</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center border-t-2 border-blue-300 pt-2 mt-2">
                              <span className="text-base font-semibold text-gray-900">Total a facturar:</span>
                              <span className="text-lg font-bold text-blue-600">{hijoFacturacion.totalImporte.toFixed(2)}€</span>
                            </div>
                          )}
                        </div>
                        {hijoFacturacion.inscripcion && (
                          <div className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200">
                            <p>
                              <strong>Inscripción:</strong> {hijoFacturacion.inscripcion.precio_diario.toFixed(2)}€/día
                              ({hijoFacturacion.inscripcion.dias_semana.length} días/semana)
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start">
                        <FacturacionCalendario
                          mesSeleccionado={mesSeleccionado}
                          diasFacturables={hijoFacturacion.diasFacturables}
                          desglose={hijoFacturacion.desglose}
                          hijoId={hijoFacturacion.hijo.id}
                        />
                      </div>
                    </div>
                  )}
            </div>
          </div>
        ))}

        {facturacion.hijosFacturacion.filter(h => h.totalDias > 0).length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin servicios de comedor</h3>
            <p className="text-gray-600">
              No hay servicios de comedor registrados para el mes seleccionado
            </p>
          </div>
        )}
      </div>

    </div>
  );
}