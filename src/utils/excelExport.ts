import * as XLSX from 'xlsx';
import { FacturacionPadre } from '../hooks/useFacturacionAdmin';

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
