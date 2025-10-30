import React, { useState, useEffect } from 'react';
import { Euro, CreditCard as Edit2, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ConfiguracionPrecio {
  id: string;
  nombre: string;
  dias_min: number;
  dias_max: number;
  precio: number;
  descuento_tercer_hijo: number;
  descuento_asistencia_80: number;
  umbral_asistencia_descuento: number;
  precio_adulto: number;
  precio_hijo_personal: number;
  dias_antelacion: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export function ConfiguracionPreciosManager() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionPrecio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ConfiguracionPrecio>>({});
  const [saving, setSaving] = useState(false);
  const [descuentoTercerHijo, setDescuentoTercerHijo] = useState<number>(0);
  const [editingDescuento, setEditingDescuento] = useState(false);
  const [descuentoAsistencia80, setDescuentoAsistencia80] = useState<number>(18);
  const [editingDescuentoAsistencia, setEditingDescuentoAsistencia] = useState(false);
  const [umbralAsistencia, setUmbralAsistencia] = useState<number>(80);
  const [editingUmbralAsistencia, setEditingUmbralAsistencia] = useState(false);
  const [precioAdulto, setPrecioAdulto] = useState<number>(0);
  const [editingPrecioAdulto, setEditingPrecioAdulto] = useState(false);
  const [precioHijoPersonal, setPrecioHijoPersonal] = useState<number>(0);
  const [editingPrecioHijoPersonal, setEditingPrecioHijoPersonal] = useState(false);
  const [diasAntelacion, setDiasAntelacion] = useState<number>(2);
  const [editingDiasAntelacion, setEditingDiasAntelacion] = useState(false);

  useEffect(() => {
    loadConfiguraciones();
  }, []);

  const loadConfiguraciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('configuracion_precios')
        .select('*')
        .order('dias_min', { ascending: true });

      if (fetchError) throw fetchError;
      const configs = data || [];
      setConfiguraciones(configs);
      if (configs.length > 0) {
        setDescuentoTercerHijo(configs[0].descuento_tercer_hijo || 0);
        setDescuentoAsistencia80(configs[0].descuento_asistencia_80 || 18);
        setUmbralAsistencia(configs[0].umbral_asistencia_descuento || 80);
        setPrecioAdulto(configs[0].precio_adulto);
        setPrecioHijoPersonal(configs[0].precio_hijo_personal);
        setDiasAntelacion(configs[0].dias_antelacion || 2);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: ConfiguracionPrecio) => {
    setEditingId(config.id);
    setEditData({
      precio: config.precio
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('configuracion_precios')
        .update({
          precio: editData.precio,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await loadConfiguraciones();
      setEditingId(null);
      setEditData({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-gray-600">Cargando configuración de precios...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Euro className="h-6 w-6 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configuración de Precios
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Precio único para todos los alumnos, independientemente del número de días de asistencia
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {configuraciones.map((config) => {
            const isEditing = editingId === config.id;
            const diasText = config.dias_min === config.dias_max
              ? `${config.dias_min} día${config.dias_min > 1 ? 's' : ''}`
              : `${config.dias_min}-${config.dias_max} días`;

            return (
              <div
                key={config.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold text-sm">
                        {diasText}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData.precio || ''}
                            onChange={(e) => setEditData({ ...editData, precio: parseFloat(e.target.value) })}
                            className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-700 font-medium">€ / día</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {config.precio.toFixed(2)}€
                          </span>
                          <span className="text-gray-600">/ día</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {config.nombre}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(config.id)}
                          disabled={saving || !editData.precio || editData.precio <= 0}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={saving}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancelar</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(config)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 space-y-4">
          {/* Precio para hijos de personal */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Precio para hijos de personal del colegio
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Precio fijo mensual para hijos de padres que trabajan en el colegio (independiente del número de días)
                </p>
                {editingPrecioHijoPersonal ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioHijoPersonal}
                      onChange={(e) => setPrecioHijoPersonal(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">€ / mes</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {precioHijoPersonal.toFixed(2)}€
                    </span>
                    <span className="text-gray-600">/ mes</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingPrecioHijoPersonal ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              precio_hijo_personal: precioHijoPersonal,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingPrecioHijoPersonal(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || precioHijoPersonal <= 0}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrecioHijoPersonal(false);
                        if (configuraciones.length > 0) {
                          setPrecioHijoPersonal(configuraciones[0].precio_hijo_personal);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingPrecioHijoPersonal(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Precio para adultos/personal */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Precio para personal/adultos
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Precio fijo por día para padres que trabajan en el colegio (sin descuentos)
                </p>
                {editingPrecioAdulto ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioAdulto}
                      onChange={(e) => setPrecioAdulto(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">€ / día</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {precioAdulto.toFixed(2)}€
                    </span>
                    <span className="text-gray-600">/ día</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingPrecioAdulto ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              precio_adulto: precioAdulto,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingPrecioAdulto(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || precioAdulto <= 0}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPrecioAdulto(false);
                        if (configuraciones.length > 0) {
                          setPrecioAdulto(configuraciones[0].precio_adulto);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingPrecioAdulto(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Días de antelación */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Días de antelación para cancelaciones/modificaciones
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Número mínimo de días con los que los padres deben comunicar bajas o solicitudes de comida puntual
                </p>
                {editingDiasAntelacion ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="7"
                      value={diasAntelacion}
                      onChange={(e) => setDiasAntelacion(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">días</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {diasAntelacion}
                    </span>
                    <span className="text-gray-600">día{diasAntelacion !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingDiasAntelacion ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              dias_antelacion: diasAntelacion,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingDiasAntelacion(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || diasAntelacion < 0 || diasAntelacion > 7}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDiasAntelacion(false);
                        if (configuraciones.length > 0) {
                          setDiasAntelacion(configuraciones[0].dias_antelacion || 2);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingDiasAntelacion(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Descuento familias numerosas */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Descuento para familias numerosas
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  A partir del 3er hijo, se aplica un descuento. Se mantienen las 2 inscripciones más caras a precio completo.
                </p>
                {editingDescuento ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={descuentoTercerHijo}
                      onChange={(e) => setDescuentoTercerHijo(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">% de descuento</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-green-600">
                      {descuentoTercerHijo.toFixed(0)}%
                    </span>
                    <span className="text-gray-600">de descuento</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingDescuento ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              descuento_tercer_hijo: descuentoTercerHijo,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingDescuento(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || descuentoTercerHijo < 0 || descuentoTercerHijo > 100}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescuento(false);
                        if (configuraciones.length > 0) {
                          setDescuentoTercerHijo(configuraciones[0].descuento_tercer_hijo || 0);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingDescuento(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Descuento por asistencia del 80% */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Descuento por asistencia
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Cuando un alumno asiste al número mínimo de días requeridos (calculado como días laborables × umbral, redondeado hacia arriba), se aplica este descuento sobre el total del mes. Los días laborables son de lunes a viernes, excluyendo festivos.
                </p>
                {editingDescuentoAsistencia ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={descuentoAsistencia80}
                      onChange={(e) => setDescuentoAsistencia80(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">% de descuento</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-green-600">
                      {descuentoAsistencia80.toFixed(0)}%
                    </span>
                    <span className="text-gray-600">de descuento</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingDescuentoAsistencia ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              descuento_asistencia_80: descuentoAsistencia80,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingDescuentoAsistencia(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || descuentoAsistencia80 < 0 || descuentoAsistencia80 > 100}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescuentoAsistencia(false);
                        if (configuraciones.length > 0) {
                          setDescuentoAsistencia80(configuraciones[0].descuento_asistencia_80 || 18);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingDescuentoAsistencia(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Umbral de asistencia para aplicar el descuento */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Umbral de asistencia para descuento
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Porcentaje mínimo de asistencia requerido para aplicar el descuento. El número de días requeridos se calcula como: (días laborables del mes × umbral / 100) y se redondea hacia arriba. Ejemplo: si hay 22 días laborables y el umbral es 80%, se requieren 18 días (22 × 0.80 = 17.6 → 18 días).
                </p>
                {editingUmbralAsistencia ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={umbralAsistencia}
                      onChange={(e) => setUmbralAsistencia(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-700 font-medium">% de asistencia</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {umbralAsistencia.toFixed(0)}%
                    </span>
                    <span className="text-gray-600">de asistencia mínima</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingUmbralAsistencia ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setSaving(true);
                          setError(null);
                          const { error: updateError } = await supabase
                            .from('configuracion_precios')
                            .update({
                              umbral_asistencia_descuento: umbralAsistencia,
                              updated_at: new Date().toISOString()
                            })
                            .eq('activo', true);
                          if (updateError) throw updateError;
                          await loadConfiguraciones();
                          setEditingUmbralAsistencia(false);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || umbralAsistencia < 0 || umbralAsistencia > 100}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUmbralAsistencia(false);
                        if (configuraciones.length > 0) {
                          setUmbralAsistencia(configuraciones[0].umbral_asistencia_descuento || 80);
                        }
                      }}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingUmbralAsistencia(true)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Todos los alumnos pagan el mismo precio por día, sin importar cuántos días asistan</li>
                <li>Los cambios de precio no afectan a las inscripciones ya existentes</li>
                <li>Solo las nuevas inscripciones usarán los precios actualizados</li>
                <li>El descuento para familias numerosas se aplica automáticamente a partir del 3er hijo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}