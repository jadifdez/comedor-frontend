import * as XLSX from 'xlsx';
import { FacturacionPadre } from '../hooks/useFacturacionAdmin';
import { supabase } from '../lib/supabase';

interface ExcelExportOptions {
  mesSeleccionado: string;
  facturacion: FacturacionPadre[];
}

interface InscripcionAlumnoExport {
  id: string;
  hijo_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  descuento_aplicado: number;
  hijo_details: {
    nombre: string;
    grado: { nombre: string } | null;
  };
}

interface InscripcionPadreExport {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  padre: {
    nombre: string;
    exento_facturacion: boolean;
  };
}

interface InscripcionesExportOptions {
  inscripcionesAlumnos: InscripcionAlumnoExport[];
  inscripcionesPadres: InscripcionPadreExport[];
}

export function exportarFacturacionAExcel({ mesSeleccionado, facturacion }: ExcelExportOptions) {
  const workbook = XLSX.utils.book_new();

  const [year, month] = mesSeleccionado.split('-');
  const mesNombre = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const totalGeneral = facturacion.reduce((sum, f) => sum + f.totalGeneral, 0);
  const totalDias = facturacion.reduce((sum, f) => sum + f.totalDias, 0);
  const totalFamilias = facturacion.length;
  const totalPersonas = facturacion.reduce((sum, f) => {
    let personas = f.hijos.length;
    if (f.padreComedor) personas += 1;
    return sum + personas;
  }, 0);

  const totalDiasInscripcion = facturacion.reduce((sum, f) => {
    let dias = f.hijos.reduce((s, h) => s + h.diasInscripcion, 0);
    if (f.padreComedor) dias += f.padreComedor.diasInscripcion;
    return sum + dias;
  }, 0);

  const totalDiasPuntuales = facturacion.reduce((sum, f) => {
    let dias = f.hijos.reduce((s, h) => s + h.diasPuntuales, 0);
    if (f.padreComedor) dias += f.padreComedor.diasPuntuales;
    return sum + dias;
  }, 0);

  const resumenData = [
    ['FACTURACIÓN COMEDOR ESCOLAR'],
    ['Mes:', mesNombre],
    [],
    ['RESUMEN GENERAL'],
    ['Total a facturar:', totalGeneral.toFixed(2) + ' €'],
    ['Total días facturados:', totalDias],
    ['Familias con servicio:', totalFamilias],
    ['Total personas (alumnos + personal):', totalPersonas],
    [],
    ['DESGLOSE DE DÍAS'],
    ['Días por inscripción:', totalDiasInscripcion],
    ['Días puntuales:', totalDiasPuntuales],
    ['Días de baja:', facturacion.reduce((sum, f) => {
      let dias = f.hijos.reduce((s, h) => s + h.diasBaja, 0);
      if (f.padreComedor) dias += f.padreComedor.diasBaja;
      return sum + dias;
    }, 0)],
    [],
    ['FAMILIAS POR ORDEN DE IMPORTE'],
    ['Posición', 'Familia', 'Email', 'Importe', 'Días', 'Personal']
  ];

  facturacion.forEach((fam, index) => {
    resumenData.push([
      (index + 1).toString(),
      fam.padre.nombre,
      fam.padre.email,
      fam.totalGeneral.toFixed(2) + ' €',
      fam.totalDias.toString(),
      fam.padre.es_personal ? 'SÍ' : 'NO'
    ]);
  });

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

  wsResumen['!cols'] = [
    { wch: 15 },
    { wch: 35 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  facturacion.forEach((famFacturacion, index) => {
    const familiaData: any[][] = [];

    familiaData.push(['DATOS DE LA FAMILIA']);
    familiaData.push(['Padre/Madre:', famFacturacion.padre.nombre]);
    familiaData.push(['Email:', famFacturacion.padre.email]);
    if (famFacturacion.padre.telefono) {
      familiaData.push(['Teléfono:', famFacturacion.padre.telefono]);
    }
    familiaData.push(['Personal del colegio:', famFacturacion.padre.es_personal ? 'SÍ' : 'NO']);
    familiaData.push([]);
    familiaData.push(['RESUMEN FAMILIAR']);
    familiaData.push(['Total a facturar:', famFacturacion.totalGeneral.toFixed(2) + ' €']);
    familiaData.push(['Total días:', famFacturacion.totalDias]);
    familiaData.push([]);

    if (famFacturacion.padreComedor && (famFacturacion.padreComedor.totalImporte > 0 || famFacturacion.padreComedor.estaExento)) {
      familiaData.push(['COMEDOR DEL PADRE/MADRE (PERSONAL DEL COLEGIO)']);
      if (famFacturacion.padreComedor.estaExento) {
        familiaData.push(['EXENTO DE FACTURACIÓN:', 'SÍ']);
        if (famFacturacion.padreComedor.motivoExencion) {
          familiaData.push(['Motivo Exención:', famFacturacion.padreComedor.motivoExencion]);
        }
      }
      familiaData.push([]);
      familiaData.push([
        'Días Inscripción',
        'Días Puntuales',
        'Días Baja',
        'Total Días',
        'Importe Total'
      ]);
      familiaData.push([
        famFacturacion.padreComedor.diasInscripcion,
        famFacturacion.padreComedor.diasPuntuales,
        famFacturacion.padreComedor.diasBaja,
        famFacturacion.padreComedor.diasFacturables.length,
        famFacturacion.padreComedor.totalImporte.toFixed(2) + ' €'
      ]);

      if (famFacturacion.padreComedor.tieneDescuentoAsistencia80) {
        familiaData.push([]);
        familiaData.push(['DESCUENTO POR ASISTENCIA']);
        familiaData.push(['Porcentaje de asistencia:', `${famFacturacion.padreComedor.porcentajeAsistencia}%`]);
        familiaData.push(['Descuento aplicado:', `${famFacturacion.padreComedor.porcentajeDescuentoAsistencia80}%`]);
        familiaData.push(['Subtotal sin descuento:', (famFacturacion.padreComedor.totalImporteSinDescuento || 0).toFixed(2) + ' €']);
        familiaData.push(['Descuento:', ((famFacturacion.padreComedor.totalImporteSinDescuento || 0) - famFacturacion.padreComedor.totalImporte).toFixed(2) + ' €']);
        familiaData.push(['Total con descuento:', famFacturacion.padreComedor.totalImporte.toFixed(2) + ' €']);
      }

      familiaData.push([]);

      familiaData.push(['DETALLE DE DÍAS FACTURABLES (PADRE/MADRE)']);
      familiaData.push(['Fecha', 'Día Semana', 'Tipo', 'Precio']);

      famFacturacion.padreComedor.diasFacturables.forEach(dia => {
        const fecha = new Date(dia.fecha + 'T00:00:00');
        const fechaFormato = fecha.toLocaleDateString('es-ES');
        const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
        const tipo = dia.tipo === 'inscripcion' ? 'Inscripción' : 'Puntual';

        familiaData.push([
          fechaFormato,
          diaSemana,
          tipo,
          dia.precio.toFixed(2) + ' €'
        ]);
      });

      familiaData.push([]);
      familiaData.push([]);
    }

    familiaData.push(['HIJOS']);
    familiaData.push([]);

    famFacturacion.hijos.forEach((hijoData, hijoIndex) => {
      if (hijoIndex > 0) {
        familiaData.push([]);
      }

      familiaData.push([`HIJO ${hijoIndex + 1}: ${hijoData.hijo.nombre}`]);
      familiaData.push(['Grado/Curso:', hijoData.hijo.grado?.nombre || 'No especificado']);

      if (hijoData.esHijoDePersonal) {
        familiaData.push(['Tipo:', 'Hijo de Personal del Colegio']);
      }

      if (hijoData.estaExento) {
        familiaData.push(['EXENTO DE FACTURACIÓN:', 'SÍ']);
        if (hijoData.motivoExencion) {
          familiaData.push(['Motivo Exención:', hijoData.motivoExencion]);
        }
      }

      if (hijoData.tieneDescuentoFamiliaNumerosa) {
        familiaData.push(['Descuento Familia Numerosa:', `${hijoData.porcentajeDescuento}%`]);
      }

      if (hijoData.inscripcion) {
        familiaData.push(['Precio diario:', hijoData.inscripcion.precio_diario.toFixed(2) + ' €']);
        familiaData.push(['Días semana inscritos:', hijoData.inscripcion.dias_semana.length]);
      }

      familiaData.push([]);
      familiaData.push([
        'Días Inscripción',
        'Días Puntuales',
        'Días Baja',
        'Total Días',
        'Importe Total'
      ]);
      familiaData.push([
        hijoData.diasInscripcion,
        hijoData.diasPuntuales,
        hijoData.diasBaja,
        hijoData.diasFacturables.length,
        hijoData.totalImporte.toFixed(2) + ' €'
      ]);

      if (hijoData.tieneDescuentoAsistencia80) {
        familiaData.push([]);
        familiaData.push(['DESCUENTO POR ASISTENCIA']);
        familiaData.push(['Porcentaje de asistencia:', `${hijoData.porcentajeAsistencia}%`]);
        familiaData.push(['Descuento aplicado:', `${hijoData.porcentajeDescuentoAsistencia80}%`]);
        familiaData.push(['Subtotal sin descuento:', (hijoData.totalImporteSinDescuento || 0).toFixed(2) + ' €']);
        familiaData.push(['Descuento:', ((hijoData.totalImporteSinDescuento || 0) - hijoData.totalImporte).toFixed(2) + ' €']);
        familiaData.push(['Total con descuento:', hijoData.totalImporte.toFixed(2) + ' €']);
      }

      familiaData.push([]);
      familiaData.push(['DETALLE DE DÍAS FACTURABLES']);
      familiaData.push(['Fecha', 'Día Semana', 'Tipo', 'Precio']);

      hijoData.diasFacturables.forEach(dia => {
        const fecha = new Date(dia.fecha + 'T00:00:00');
        const fechaFormato = fecha.toLocaleDateString('es-ES');
        const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
        const tipo = dia.tipo === 'inscripcion' ? 'Inscripción' : 'Puntual';

        familiaData.push([
          fechaFormato,
          diaSemana,
          tipo,
          dia.precio.toFixed(2) + ' €'
        ]);
      });

      familiaData.push([]);
    });

    familiaData.push([]);
    familiaData.push(['TOTALES FAMILIA']);
    familiaData.push(['Total General:', famFacturacion.totalGeneral.toFixed(2) + ' €']);
    familiaData.push(['Total Días:', famFacturacion.totalDias]);

    const wsFamilia = XLSX.utils.aoa_to_sheet(familiaData);

    wsFamilia['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    const nombreHoja = `${index + 1}. ${famFacturacion.padre.nombre.substring(0, 25)}`;
    XLSX.utils.book_append_sheet(workbook, wsFamilia, nombreHoja);
  });

  // Hoja de exenciones activas
  const exencionesData: any[][] = [];
  exencionesData.push(['EXENCIONES DE FACTURACIÓN ACTIVAS']);
  exencionesData.push(['Mes:', mesNombre]);
  exencionesData.push([]);
  exencionesData.push(['Tipo', 'Nombre', 'Familia', 'Motivo', 'Importe Teórico', 'Importe Exento']);

  let totalImporteExento = 0;

  facturacion.forEach(fam => {
    // Exenciones de hijos
    fam.hijos.forEach(hijo => {
      if (hijo.estaExento) {
        const importeTeorico = hijo.totalImporteSinDescuento || 0;
        totalImporteExento += importeTeorico;
        exencionesData.push([
          'Alumno',
          hijo.hijo.nombre,
          fam.padre.nombre,
          hijo.motivoExencion || 'No especificado',
          importeTeorico.toFixed(2) + ' €',
          importeTeorico.toFixed(2) + ' €'
        ]);
      }
    });

    // Exención del padre
    if (fam.padreComedor?.estaExento) {
      const importeTeorico = fam.padreComedor.totalImporteSinDescuento || 0;
      totalImporteExento += importeTeorico;
      exencionesData.push([
        'Padre/Madre (Personal)',
        fam.padre.nombre,
        fam.padre.nombre,
        fam.padreComedor.motivoExencion || 'No especificado',
        importeTeorico.toFixed(2) + ' €',
        importeTeorico.toFixed(2) + ' €'
      ]);
    }
  });

  if (exencionesData.length > 4) {
    exencionesData.push([]);
    exencionesData.push(['TOTAL IMPORTE EXENTO:', '', '', '', '', totalImporteExento.toFixed(2) + ' €']);

    const wsExenciones = XLSX.utils.aoa_to_sheet(exencionesData);
    wsExenciones['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsExenciones, 'Exenciones');
  }

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Facturacion_${mesNombre.replace(' ', '_')}_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalFamilias,
    totalGeneral
  };
}

export function exportarInscripcionesAExcel({ inscripcionesAlumnos, inscripcionesPadres }: InscripcionesExportOptions) {
  const workbook = XLSX.utils.book_new();

  const totalInscripciones = inscripcionesAlumnos.length + inscripcionesPadres.length;
  const alumnosActivos = inscripcionesAlumnos.filter(i => i.activo).length;
  const alumnosInactivos = inscripcionesAlumnos.filter(i => !i.activo).length;
  const personalActivo = inscripcionesPadres.filter(i => i.activo).length;
  const personalInactivo = inscripcionesPadres.filter(i => !i.activo).length;

  const resumenData = [
    ['INSCRIPCIONES AL COMEDOR ESCOLAR'],
    ['Fecha de exportación:', new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })],
    [],
    ['RESUMEN GENERAL'],
    ['Total inscripciones:', totalInscripciones],
    ['Total alumnos inscritos:', inscripcionesAlumnos.length],
    ['Total personal inscrito:', inscripcionesPadres.length],
    [],
    ['INSCRIPCIONES DE ALUMNOS'],
    ['Inscripciones activas:', alumnosActivos],
    ['Inscripciones inactivas:', alumnosInactivos],
    [],
    ['INSCRIPCIONES DE PERSONAL'],
    ['Inscripciones activas:', personalActivo],
    ['Inscripciones inactivas:', personalInactivo],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [
    { wch: 30 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  const diasSemanaMap: { [key: number]: string } = {
    1: 'L',
    2: 'M',
    3: 'X',
    4: 'J',
    5: 'V'
  };

  const getDiasText = (dias: number[]): string => {
    return [1, 2, 3, 4, 5].map(d => dias.includes(d) ? diasSemanaMap[d] : '-').join(' ');
  };

  const alumnosData: any[][] = [
    ['INSCRIPCIONES DE ALUMNOS'],
    [],
    ['Nombre', 'Grado', 'Días Semana', 'Precio Diario', 'Descuento', 'Fecha Inicio', 'Fecha Fin', 'Estado']
  ];

  const alumnosOrdenados = [...inscripcionesAlumnos].sort((a, b) => {
    const nombreA = a.hijo_details?.nombre || '';
    const nombreB = b.hijo_details?.nombre || '';
    return nombreA.localeCompare(nombreB);
  });

  alumnosOrdenados.forEach(insc => {
    const fechaInicio = new Date(insc.fecha_inicio).toLocaleDateString('es-ES');
    const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin).toLocaleDateString('es-ES') : 'Indefinida';

    alumnosData.push([
      insc.hijo_details?.nombre || 'Sin nombre',
      insc.hijo_details?.grado?.nombre || 'Sin grado',
      getDiasText(insc.dias_semana),
      insc.precio_diario.toFixed(2) + ' €',
      insc.descuento_aplicado > 0 ? '-' + insc.descuento_aplicado.toFixed(2) + ' €' : 'Sin descuento',
      fechaInicio,
      fechaFin,
      insc.activo ? 'ACTIVA' : 'INACTIVA'
    ]);
  });

  const wsAlumnos = XLSX.utils.aoa_to_sheet(alumnosData);
  wsAlumnos['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsAlumnos, 'Alumnos');

  const personalData: any[][] = [
    ['INSCRIPCIONES DE PERSONAL'],
    [],
    ['Nombre', 'Días Semana', 'Precio Diario', 'Exento', 'Fecha Inicio', 'Fecha Fin', 'Estado']
  ];

  const personalOrdenado = [...inscripcionesPadres].sort((a, b) => {
    const nombreA = a.padre?.nombre || '';
    const nombreB = b.padre?.nombre || '';
    return nombreA.localeCompare(nombreB);
  });

  personalOrdenado.forEach(insc => {
    const fechaInicio = new Date(insc.fecha_inicio).toLocaleDateString('es-ES');
    const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin).toLocaleDateString('es-ES') : 'Indefinida';

    personalData.push([
      insc.padre?.nombre || 'Sin nombre',
      getDiasText(insc.dias_semana),
      insc.padre?.exento_facturacion ? 'EXENTO' : insc.precio_diario.toFixed(2) + ' €',
      insc.padre?.exento_facturacion ? 'SÍ' : 'NO',
      fechaInicio,
      fechaFin,
      insc.activo ? 'ACTIVA' : 'INACTIVA'
    ]);
  });

  const wsPersonal = XLSX.utils.aoa_to_sheet(personalData);
  wsPersonal['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsPersonal, 'Personal');

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Inscripciones_Comedor_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalInscripciones
  };
}

interface PersonalExportData {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  exento_facturacion: boolean;
  motivo_exencion: string | null;
  fecha_inicio_exencion: string | null;
  fecha_fin_exencion: string | null;
  hijos_count?: number;
  tiene_inscripcion_activa?: boolean;
}

interface PersonalExportOptions {
  personal: PersonalExportData[];
}

export function exportarPersonalAExcel({ personal }: PersonalExportOptions) {
  const workbook = XLSX.utils.book_new();

  const totalPersonal = personal.length;
  const personalActivo = personal.filter(p => p.activo).length;
  const personalInactivo = personal.filter(p => !p.activo).length;
  const personalConHijos = personal.filter(p => (p.hijos_count || 0) > 0).length;
  const personalInscrito = personal.filter(p => p.tiene_inscripcion_activa).length;
  const personalExento = personal.filter(p => p.exento_facturacion).length;

  const resumenData = [
    ['LISTADO DE PERSONAL DEL COLEGIO'],
    ['Fecha de exportación:', new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })],
    [],
    ['RESUMEN GENERAL'],
    ['Total personal:', totalPersonal],
    ['Personal activo:', personalActivo],
    ['Personal inactivo:', personalInactivo],
    [],
    ['DETALLES'],
    ['Personal con hijos:', personalConHijos],
    ['Personal con inscripción al comedor:', personalInscrito],
    ['Personal exento de facturación:', personalExento],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [
    { wch: 35 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  const personalData: any[][] = [
    ['LISTADO COMPLETO DE PERSONAL'],
    [],
    ['Nombre', 'Email', 'Teléfono', 'Estado', 'Hijos', 'Inscrito Comedor', 'Exento Facturación', 'Motivo Exención']
  ];

  const personalOrdenado = [...personal].sort((a, b) => a.nombre.localeCompare(b.nombre));

  personalOrdenado.forEach(p => {
    personalData.push([
      p.nombre,
      p.email,
      p.telefono || 'Sin teléfono',
      p.activo ? 'ACTIVO' : 'INACTIVO',
      (p.hijos_count || 0).toString(),
      p.tiene_inscripcion_activa ? 'SÍ' : 'NO',
      p.exento_facturacion ? 'SÍ' : 'NO',
      p.exento_facturacion ? (p.motivo_exencion || 'No especificado') : '-'
    ]);
  });

  const wsPersonal = XLSX.utils.aoa_to_sheet(personalData);
  wsPersonal['!cols'] = [
    { wch: 30 },
    { wch: 35 },
    { wch: 15 },
    { wch: 12 },
    { wch: 8 },
    { wch: 18 },
    { wch: 20 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsPersonal, 'Personal');

  // Hoja de personal exento
  if (personalExento > 0) {
    const exentosData: any[][] = [
      ['PERSONAL EXENTO DE FACTURACIÓN'],
      [],
      ['Nombre', 'Email', 'Motivo Exención', 'Fecha Inicio', 'Fecha Fin']
    ];

    personal
      .filter(p => p.exento_facturacion)
      .forEach(p => {
        const fechaInicio = p.fecha_inicio_exencion
          ? new Date(p.fecha_inicio_exencion).toLocaleDateString('es-ES')
          : 'No especificada';
        const fechaFin = p.fecha_fin_exencion
          ? new Date(p.fecha_fin_exencion).toLocaleDateString('es-ES')
          : 'Permanente';

        exentosData.push([
          p.nombre,
          p.email,
          p.motivo_exencion || 'No especificado',
          fechaInicio,
          fechaFin
        ]);
      });

    const wsExentos = XLSX.utils.aoa_to_sheet(exentosData);
    wsExentos['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsExentos, 'Exentos');
  }

  // Hoja de contactos (Personal con hijos)
  if (personalConHijos > 0) {
    const contactosData: any[][] = [
      ['PERSONAL CON HIJOS - CONTACTOS'],
      [],
      ['Nombre', 'Email', 'Teléfono', 'Número de Hijos', 'Estado']
    ];

    personal
      .filter(p => (p.hijos_count || 0) > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(p => {
        contactosData.push([
          p.nombre,
          p.email,
          p.telefono || 'Sin teléfono',
          (p.hijos_count || 0).toString(),
          p.activo ? 'ACTIVO' : 'INACTIVO'
        ]);
      });

    const wsContactos = XLSX.utils.aoa_to_sheet(contactosData);
    wsContactos['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsContactos, 'Con Hijos');
  }

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Personal_Colegio_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalPersonal
  };
}

interface PadresExportData {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  hijos_count?: number;
  hijos_activos?: number;
  tiene_inscripcion_activa?: boolean;
}

interface PadresExportOptions {
  padres: PadresExportData[];
}

export function exportarPadresAExcel({ padres }: PadresExportOptions) {
  const workbook = XLSX.utils.book_new();

  const totalPadres = padres.length;
  const padresActivos = padres.filter(p => p.activo).length;
  const padresInactivos = padres.filter(p => !p.activo).length;
  const padresConHijos = padres.filter(p => (p.hijos_count || 0) > 0).length;
  const padresSinHijos = padres.filter(p => (p.hijos_count || 0) === 0).length;
  const padresInscritosComedor = padres.filter(p => p.tiene_inscripcion_activa).length;

  const resumenData = [
    ['LISTADO DE PADRES/MADRES'],
    ['Fecha de exportación:', new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })],
    [],
    ['RESUMEN GENERAL'],
    ['Total padres/madres:', totalPadres],
    ['Padres activos:', padresActivos],
    ['Padres inactivos:', padresInactivos],
    [],
    ['DETALLES'],
    ['Padres con hijos:', padresConHijos],
    ['Padres sin hijos:', padresSinHijos],
    ['Padres inscritos al comedor (personal):', padresInscritosComedor],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [
    { wch: 40 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  const padresData: any[][] = [
    ['LISTADO COMPLETO DE PADRES/MADRES'],
    [],
    ['Nombre', 'Email', 'Teléfono', 'Estado', 'Total Hijos', 'Hijos Activos', 'Inscrito Comedor']
  ];

  const padresOrdenados = [...padres].sort((a, b) => a.nombre.localeCompare(b.nombre));

  padresOrdenados.forEach(p => {
    padresData.push([
      p.nombre,
      p.email,
      p.telefono || 'Sin teléfono',
      p.activo ? 'ACTIVO' : 'INACTIVO',
      (p.hijos_count || 0).toString(),
      (p.hijos_activos || 0).toString(),
      p.tiene_inscripcion_activa ? 'SÍ' : 'NO'
    ]);
  });

  const wsPadres = XLSX.utils.aoa_to_sheet(padresData);
  wsPadres['!cols'] = [
    { wch: 30 },
    { wch: 35 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsPadres, 'Padres');

  // Hoja de contactos (Padres con hijos activos)
  if (padresConHijos > 0) {
    const contactosData: any[][] = [
      ['CONTACTOS DE PADRES/MADRES'],
      [],
      ['Nombre', 'Email', 'Teléfono', 'Total Hijos', 'Hijos Activos', 'Estado']
    ];

    padres
      .filter(p => (p.hijos_count || 0) > 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(p => {
        contactosData.push([
          p.nombre,
          p.email,
          p.telefono || 'Sin teléfono',
          (p.hijos_count || 0).toString(),
          (p.hijos_activos || 0).toString(),
          p.activo ? 'ACTIVO' : 'INACTIVO'
        ]);
      });

    const wsContactos = XLSX.utils.aoa_to_sheet(contactosData);
    wsContactos['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsContactos, 'Contactos');
  }

  // Hoja de padres sin hijos (para revisión)
  if (padresSinHijos > 0) {
    const sinHijosData: any[][] = [
      ['PADRES/MADRES SIN HIJOS REGISTRADOS'],
      [],
      ['Nombre', 'Email', 'Teléfono', 'Estado', 'Nota']
    ];

    padres
      .filter(p => (p.hijos_count || 0) === 0)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(p => {
        sinHijosData.push([
          p.nombre,
          p.email,
          p.telefono || 'Sin teléfono',
          p.activo ? 'ACTIVO' : 'INACTIVO',
          p.tiene_inscripcion_activa ? 'Personal del colegio' : 'Revisar'
        ]);
      });

    const wsSinHijos = XLSX.utils.aoa_to_sheet(sinHijosData);
    wsSinHijos['!cols'] = [
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 12 },
      { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsSinHijos, 'Sin Hijos');
  }

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Padres_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalPadres
  };
}

export async function exportarParteDiarioMensual(mesSeleccionado: string) {
  try {
    const [year, month] = mesSeleccionado.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    const primerDia = new Date(yearNum, monthNum - 1, 1);
    const ultimoDia = new Date(yearNum, monthNum, 0);
    const diasDelMes = ultimoDia.getDate();

    const fechaInicio = `${year}-${month}-01`;
    const fechaFin = `${year}-${month}-${diasDelMes.toString().padStart(2, '0')}`;

    const { data: grados, error: gradosError } = await supabase
      .from('grados')
      .select('id, nombre')
      .order('nombre');

    if (gradosError) throw gradosError;

    const { data: hijos, error: hijosError } = await supabase
      .from('hijos')
      .select(`
        id,
        nombre,
        grado_id,
        padre_id,
        grados!inner(nombre)
      `)
      .eq('activo', true)
      .order('nombre');

    if (hijosError) throw hijosError;

    const hijosIds = hijos.map(h => h.id);

    const { data: todasInscripciones, error: inscripcionesError } = await supabase
      .from('comedor_inscripciones')
      .select('*')
      .in('hijo_id', hijosIds);

    if (inscripcionesError) throw inscripcionesError;

    const inscripciones = todasInscripciones?.filter(i => {
      const inicio = new Date(i.fecha_inicio);
      const fin = i.fecha_fin ? new Date(i.fecha_fin) : null;
      return inicio <= ultimoDia && (!fin || fin >= primerDia);
    });

    const { data: bajas, error: bajasError } = await supabase
      .from('comedor_bajas')
      .select('*')
      .in('hijo_id', hijosIds)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (bajasError) throw bajasError;

    const { data: solicitudes, error: solicitudesError } = await supabase
      .from('comedor_solicitudes')
      .select('*')
      .in('hijo_id', hijosIds)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .eq('aprobada', true);

    if (solicitudesError) throw solicitudesError;

    const { data: invitaciones, error: invitacionesError } = await supabase
      .from('comedor_invitaciones')
      .select('*')
      .in('hijo_id', hijosIds)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (invitacionesError) throw invitacionesError;

    const { data: restricciones, error: restriccionesError } = await supabase
      .from('comedor_restricciones_dieteticas')
      .select('hijo_id, tipo_restriccion, descripcion')
      .in('hijo_id', hijosIds);

    if (restriccionesError) throw restriccionesError;

    const restriccionesPorHijo: Record<string, string[]> = {};
    restricciones?.forEach(r => {
      if (!restriccionesPorHijo[r.hijo_id]) {
        restriccionesPorHijo[r.hijo_id] = [];
      }
      restriccionesPorHijo[r.hijo_id].push(r.tipo_restriccion || r.descripcion);
    });

    const workbook = XLSX.utils.book_new();

    const mesNombre = primerDia.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });

    const hijosPorGrado: Record<string, any[]> = {};
    hijos.forEach(hijo => {
      const gradoNombre = hijo.grados?.nombre || 'Sin grado';
      if (!hijosPorGrado[gradoNombre]) {
        hijosPorGrado[gradoNombre] = [];
      }
      hijosPorGrado[gradoNombre].push(hijo);
    });

    Object.keys(hijosPorGrado).sort().forEach(gradoNombre => {
      const hijosGrado = hijosPorGrado[gradoNombre];

      const headers = ['Alumno', 'Grado', 'Inscripción'];
      for (let dia = 1; dia <= diasDelMes; dia++) {
        headers.push(dia.toString());
      }

      const sheetData: any[][] = [
        [`PARTE DIARIO - ${mesNombre.toUpperCase()} - ${gradoNombre}`],
        [],
        headers
      ];

      hijosGrado.forEach(hijo => {
        const inscripcion = inscripciones?.find(i =>
          i.hijo_id === hijo.id &&
          i.activo &&
          new Date(i.fecha_inicio) <= ultimoDia &&
          (!i.fecha_fin || new Date(i.fecha_fin) >= primerDia)
        );

        const diasInscripcion = inscripcion?.dias_semana || [];
        const diasTexto = ['', 'L', 'M', 'X', 'J', 'V'];
        const inscripcionTexto = [1, 2, 3, 4, 5]
          .filter(d => diasInscripcion.includes(d))
          .map(d => diasTexto[d])
          .join('-');

        const alergenos = restriccionesPorHijo[hijo.id] || [];
        const nombreConAlergenos = alergenos.length > 0
          ? `${hijo.nombre} (${alergenos.join(', ')})`
          : hijo.nombre;

        const row = [
          nombreConAlergenos,
          hijo.grados?.nombre || 'Sin grado',
          inscripcionTexto || '-'
        ];

        for (let dia = 1; dia <= diasDelMes; dia++) {
          const fecha = new Date(yearNum, monthNum - 1, dia);
          const diaSemana = fecha.getDay();

          if (diaSemana === 0 || diaSemana === 6) {
            row.push('');
            continue;
          }

          const fechaStr = `${year}-${month.padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

          const tieneInvitacion = invitaciones?.some(inv =>
            inv.hijo_id === hijo.id && inv.fecha === fechaStr
          );

          if (tieneInvitacion) {
            row.push('I');
            continue;
          }

          const tieneBaja = bajas?.some(b =>
            b.hijo_id === hijo.id && b.fecha === fechaStr
          );

          if (tieneBaja) {
            row.push('C');
            continue;
          }

          const tieneSolicitudPuntual = solicitudes?.some(s =>
            s.hijo_id === hijo.id && s.fecha === fechaStr
          );

          if (tieneSolicitudPuntual) {
            row.push('P');
            continue;
          }

          const diaSemanaSistema = diaSemana === 0 ? 7 : diaSemana;
          const estaInscrito = inscripcion &&
            diasInscripcion.includes(diaSemanaSistema) &&
            new Date(inscripcion.fecha_inicio) <= fecha &&
            (!inscripcion.fecha_fin || new Date(inscripcion.fecha_fin) >= fecha);

          if (estaInscrito) {
            row.push('X');
          } else {
            row.push('');
          }
        }

        sheetData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const colWidths = [
        { wch: 35 },
        { wch: 15 },
        { wch: 15 }
      ];
      for (let i = 0; i < diasDelMes; i++) {
        colWidths.push({ wch: 4 });
      }
      ws['!cols'] = colWidths;

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

      for (let R = 3; R <= range.e.r; R++) {
        for (let C = 3; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];

          if (cell && cell.v) {
            if (!cell.s) cell.s = {};

            switch (cell.v) {
              case 'X':
                cell.s = {
                  fill: { fgColor: { rgb: "4A90E2" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
                break;
              case 'C':
                cell.s = {
                  fill: { fgColor: { rgb: "E74C3C" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
                break;
              case 'P':
                cell.s = {
                  fill: { fgColor: { rgb: "27AE60" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
                break;
              case 'I':
                cell.s = {
                  fill: { fgColor: { rgb: "9B59B6" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true },
                  alignment: { horizontal: "center", vertical: "center" }
                };
                break;
            }
          }
        }
      }

      const nombreHoja = gradoNombre.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, ws, nombreHoja);
    });

    const nombreArchivo = `Parte_Diario_${mesNombre.replace(' ', '_')}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);

    return {
      nombreArchivo,
      totalGrados: Object.keys(hijosPorGrado).length,
      totalAlumnos: hijos.length
    };
  } catch (error) {
    console.error('Error exportando parte diario:', error);
    throw error;
  }
}
