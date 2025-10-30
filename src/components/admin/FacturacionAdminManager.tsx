import React, { useState } from 'react';
import { Euro, Calendar, User, Search, AlertCircle, Eye, ChevronDown, ChevronUp, Award, Users, XCircle, Download, FileSpreadsheet, CheckCircle, Shield } from 'lucide-react';
import { useFacturacionAdmin, HijoFacturacionDetalle } from '../../hooks/useFacturacionAdmin';
import { exportarFacturacionAExcel } from '../../utils/excelExport';

export function FacturacionAdminManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPadre, setExpandedPadre] = useState<string | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [hijoSeleccionado, setHijoSeleccionado] = useState<HijoFacturacionDetalle | null>(null);
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const { facturacion, loading, error } = useFacturacionAdmin(mesSeleccionado);

  const generarOpcionesMeses = () => {
    const opciones = [];
    const hoy = new Date();

    for (let i = -6; i <= 3; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const etiqueta = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long'
      });
      opciones.push({ valor, etiqueta });
    }

    return opciones;
  };

  const opcionesMeses = generarOpcionesMeses();

  const togglePadreExpansion = (padreId: string) => {
    setExpandedPadre(expandedPadre === padreId ? null : padreId);
  };

  const mostrarDetalle = (hijo: HijoFacturacionDetalle) => {
    setHijoSeleccionado(hijo);
    setShowDetalleModal(true);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTipoColor = (tipo: 'inscripcion' | 'puntual') => {
    return tipo === 'inscripcion' ? 'text-green-700 bg-green-50' : 'text-blue-700 bg-blue-50';
  };

  const handleExportarExcel = () => {
    try {
      setExportando(true);
      const resultado = exportarFacturacionAExcel({
        mesSeleccionado,
        facturacion
      });
      setExportSuccess(true);
      setTimeout(() => {
        setShowExportModal(false);
        setExportSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert(`Error al generar el archivo Excel: ${err.message}`);
    } finally {
      setExportando(false);
    }
  };

  const facturacionFiltrada = facturacion.filter(f =>
    f.padre.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.padre.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.hijos.some(h => h.hijo.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalGeneral = facturacionFiltrada.reduce((sum, p) => sum + p.totalGeneral, 0);
  const totalDias = facturacionFiltrada.reduce((sum, p) => sum + p.totalDias, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Calculando facturación...</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Euro className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Facturación por Familias</h2>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          disabled={facturacion.length === 0}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="h-5 w-5" />
          <span>Exportar a Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4" />
              <span>Mes a facturar:</span>
            </label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {opcionesMeses.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4" />
              <span>Buscar familia:</span>
            </label>
            <input
              type="text"
              placeholder="Buscar por nombre, email o hijo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Total a facturar</p>
                <p className="text-2xl font-bold text-green-900">{totalGeneral.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Total días</p>
                <p className="text-2xl font-bold text-blue-900">{totalDias}</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Familias</p>
                <p className="text-2xl font-bold text-orange-900">{facturacionFiltrada.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {facturacionFiltrada.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay familias con servicios de comedor
          </h3>
          <p className="text-gray-600">
            No se encontraron familias con servicios de comedor para el mes seleccionado
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {facturacionFiltrada.map((facturacionPadre) => (
            <div key={facturacionPadre.padre.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <User className="h-5 w-5 text-gray-500" />
                      <h4 className="text-lg font-semibold text-gray-900">
                        {facturacionPadre.padre.nombre}
                      </h4>
                      {facturacionPadre.padre.es_personal && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                          <Award className="h-3 w-3" />
                          <span>Personal</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Email:</strong> {facturacionPadre.padre.email}
                        </p>
                        {facturacionPadre.padre.telefono && (
                          <p className="text-sm text-gray-600">
                            <strong>Teléfono:</strong> {facturacionPadre.padre.telefono}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {facturacionPadre.totalGeneral.toFixed(2)}€
                        </p>
                        <p className="text-sm text-gray-600">
                          {facturacionPadre.totalDias} días facturados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <p>
                        <strong>Hijos con servicio:</strong> {facturacionPadre.hijos.filter(h => h.totalImporte > 0 || h.estaExento).length}
                      </p>
                      {facturacionPadre.padreComedor && (
                        <span className="flex items-center space-x-1 text-blue-600">
                          <Users className="h-4 w-4" />
                          <span>Incluye comedor del padre/madre</span>
                        </span>
                      )}
                      {(facturacionPadre.hijos.some(h => h.estaExento) || facturacionPadre.padreComedor?.estaExento) && (
                        <span className="flex items-center space-x-1 text-green-700">
                          <Shield className="h-4 w-4" />
                          <span>Con exención de facturación</span>
                        </span>
                      )}
                      {facturacionPadre.hijos.some(h => h.tieneDescuentoFamiliaNumerosa) && (
                        <span className="flex items-center space-x-1 text-orange-600">
                          <Award className="h-4 w-4" />
                          <span>Con descuento familia numerosa</span>
                        </span>
                      )}
                      {facturacionPadre.hijos.some(h => h.tieneDescuentoAsistencia80) && (
                        <span className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Con descuento asistencia 80%</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => togglePadreExpansion(facturacionPadre.padre.id)}
                    className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors ml-4"
                  >
                    {expandedPadre === facturacionPadre.padre.id ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Ver detalle</span>
                      </>
                    )}
                  </button>
                </div>

                {expandedPadre === facturacionPadre.padre.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-3">Detalle por persona</h5>
                    <div className="space-y-3">
                      {facturacionPadre.padreComedor && (facturacionPadre.padreComedor.totalImporte > 0 || facturacionPadre.padreComedor.estaExento) && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <h6 className="font-medium text-gray-900">
                                {facturacionPadre.padre.nombre} (Personal del colegio)
                              </h6>
                              {facturacionPadre.padreComedor.estaExento && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium" title={facturacionPadre.padreComedor.motivoExencion}>
                                  <Shield className="h-3 w-3" />
                                  <span>EXENTO</span>
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${facturacionPadre.padreComedor.estaExento ? 'text-green-700' : 'text-blue-600'}`}>
                                {facturacionPadre.padreComedor.totalImporte.toFixed(2)}€
                                {facturacionPadre.padreComedor.estaExento && ' (EXENTO)'}
                              </p>
                              {facturacionPadre.padreComedor.estaExento && facturacionPadre.padreComedor.totalImporteSinDescuento && (
                                <p className="text-xs text-gray-500 line-through">
                                  {facturacionPadre.padreComedor.totalImporteSinDescuento.toFixed(2)}€
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {facturacionPadre.padreComedor.diasFacturables.length} días
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Días inscripción:</p>
                              <p className="font-medium">{facturacionPadre.padreComedor.diasInscripcion}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Días puntuales:</p>
                              <p className="font-medium">{facturacionPadre.padreComedor.diasPuntuales}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Días baja:</p>
                              <p className="font-medium text-red-600">-{facturacionPadre.padreComedor.diasBaja}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {facturacionPadre.hijos.map((hijoData) => (
                        <div key={hijoData.hijo.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <h6 className="font-medium text-gray-900">
                                {hijoData.hijo.nombre}
                              </h6>
                              <span className="text-sm text-gray-600">
                                ({hijoData.hijo.grado?.nombre})
                              </span>
                              {hijoData.esHijoDePersonal && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  Hijo Personal
                                </span>
                              )}
                              {hijoData.tieneDescuentoFamiliaNumerosa && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                  <Award className="h-3 w-3" />
                                  <span>-{hijoData.porcentajeDescuento}%</span>
                                </span>
                              )}
                              {hijoData.tieneDescuentoAsistencia80 && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>-{hijoData.porcentajeDescuentoAsistencia80}% (80%)</span>
                                </span>
                              )}
                              {hijoData.estaExento && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium" title={hijoData.motivoExencion}>
                                  <Shield className="h-3 w-3" />
                                  <span>EXENTO</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right">
                                <p className={`font-bold ${hijoData.estaExento ? 'text-green-700' : 'text-green-600'}`}>
                                  {hijoData.totalImporte.toFixed(2)}€
                                  {hijoData.estaExento && ' (EXENTO)'}
                                </p>
                                {(hijoData.tieneDescuentoAsistencia80 || hijoData.estaExento) && hijoData.totalImporteSinDescuento && (
                                  <p className="text-xs text-gray-500 line-through">
                                    {hijoData.totalImporteSinDescuento.toFixed(2)}€
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">
                                  {hijoData.diasFacturables.length} días
                                </p>
                              </div>
                              <button
                                onClick={() => mostrarDetalle(hijoData)}
                                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Ver</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Días inscripción:</p>
                              <p className="font-medium">{hijoData.diasInscripcion}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Días puntuales:</p>
                              <p className="font-medium">{hijoData.diasPuntuales}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Días baja:</p>
                              <p className="font-medium text-red-600">-{hijoData.diasBaja}</p>
                            </div>
                          </div>

                          {hijoData.inscripcion && (
                            <div className="mt-2 text-xs text-gray-500">
                              Precio diario: {hijoData.inscripcion.precio_diario.toFixed(2)}€
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetalleModal && hijoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalle de facturación - {hijoSeleccionado.hijo.nombre}
                </h3>
                <p className="text-sm text-gray-600">
                  {opcionesMeses.find(o => o.valor === mesSeleccionado)?.etiqueta}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  {hijoSeleccionado.esHijoDePersonal && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Hijo de Personal
                    </span>
                  )}
                  {hijoSeleccionado.tieneDescuentoFamiliaNumerosa && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      <Award className="h-3 w-3" />
                      <span>Descuento Familia Numerosa: {hijoSeleccionado.porcentajeDescuento}%</span>
                    </span>
                  )}
                  {hijoSeleccionado.tieneDescuentoAsistencia80 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      <CheckCircle className="h-3 w-3" />
                      <span>Descuento Asistencia 80%: {hijoSeleccionado.porcentajeDescuentoAsistencia80}%</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDetalleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-green-800">Total mes</p>
                  <p className="text-2xl font-bold text-green-900">
                    {hijoSeleccionado.totalImporte.toFixed(2)}€
                  </p>
                  {hijoSeleccionado.tieneDescuentoAsistencia80 && hijoSeleccionado.totalImporteSinDescuento && (
                    <p className="text-xs text-green-700 mt-1">
                      Antes: {hijoSeleccionado.totalImporteSinDescuento.toFixed(2)}€
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-blue-800">Días facturados</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {hijoSeleccionado.diasFacturables.length}
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-orange-800">
                    {hijoSeleccionado.tieneDescuentoAsistencia80 ? 'Asistencia' : 'Precio promedio'}
                  </p>
                  <p className="text-2xl font-bold text-orange-900">
                    {hijoSeleccionado.tieneDescuentoAsistencia80
                      ? `${hijoSeleccionado.porcentajeAsistencia?.toFixed(0)}%`
                      : hijoSeleccionado.diasFacturables.length > 0
                        ? `${(hijoSeleccionado.totalImporte / hijoSeleccionado.diasFacturables.length).toFixed(2)}€`
                        : '0.00€'
                    }
                  </p>
                </div>
              </div>

              {/* Mostrar información del descuento del 80% en el modal */}
              {hijoSeleccionado.tieneDescuentoAsistencia80 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Descuento por asistencia aplicado</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Porcentaje de asistencia: <strong>{hijoSeleccionado.porcentajeAsistencia?.toFixed(0)}%</strong></p>
                      <p className="text-green-700">Descuento aplicado: <strong>{hijoSeleccionado.porcentajeDescuentoAsistencia80}%</strong></p>
                    </div>
                    <div>
                      <p className="text-green-700">Subtotal sin descuento: <strong>{hijoSeleccionado.totalImporteSinDescuento?.toFixed(2)}€</strong></p>
                      <p className="text-green-700">Ahorro: <strong>{((hijoSeleccionado.totalImporteSinDescuento || 0) - hijoSeleccionado.totalImporte).toFixed(2)}€</strong></p>
                    </div>
                  </div>
                </div>
              )}

              <h4 className="font-semibold text-gray-900 mb-4">Todos los días facturables</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {hijoSeleccionado.diasFacturables.map((dia, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{formatearFecha(dia.fecha)}</p>
                        <p className="text-sm text-gray-600">{dia.descripcion}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{dia.precio.toFixed(2)}€</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getTipoColor(dia.tipo)}`}>
                        {dia.tipo === 'inscripcion' ? 'Inscripción' : 'Puntual'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">Exportar Facturación a Excel</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exportando}
                className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {exportSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Archivo generado correctamente
                  </h4>
                  <p className="text-gray-600">
                    El archivo Excel se ha descargado a su dispositivo
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-700 mb-4">
                    Se va a generar un archivo Excel con la facturación completa del mes seleccionado:
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mes:</span>
                      <span className="font-medium text-gray-900">
                        {opcionesMeses.find(o => o.valor === mesSeleccionado)?.etiqueta}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Familias incluidas:</span>
                      <span className="font-medium text-gray-900">{facturacion.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total a facturar:</span>
                      <span className="font-bold text-green-600">
                        {facturacion.reduce((sum, f) => sum + f.totalGeneral, 0).toFixed(2)}€
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>El archivo incluirá:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                      <li>Hoja resumen con totales generales</li>
                      <li>Una hoja por cada familia con detalle completo</li>
                      <li>Desglose de días de inscripción, puntuales y bajas</li>
                      <li>Listado detallado de cada día facturable con precio</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowExportModal(false)}
                      disabled={exportando}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExportarExcel}
                      disabled={exportando}
                      className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
                    >
                      {exportando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Generando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          <span>Generar Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
