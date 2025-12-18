import * as XLSX from 'xlsx-js-style';
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

export function exportarFacturacionPorAlumnosAExcel({ mesSeleccionado, facturacion }: ExcelExportOptions) {
  const workbook = XLSX.utils.book_new();

  const [year, month] = mesSeleccionado.split('-');
  const mesNombre = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  interface RegistroAlumno {
    codigofacturacion: string;
    nombre: string;
    seccion: string;
    importe: number;
    estaExento: boolean;
  }

  const registros: RegistroAlumno[] = [];

  facturacion.forEach(fam => {
    fam.hijos.forEach(hijoData => {
      registros.push({
        codigofacturacion: hijoData.hijo.codigofacturacion || '',
        nombre: hijoData.hijo.nombre,
        seccion: hijoData.hijo.grado?.nombre || '',
        importe: hijoData.totalImporte,
        estaExento: hijoData.estaExento
      });
    });

    if (fam.padreComedor && (fam.padreComedor.totalImporte > 0 || fam.padreComedor.estaExento)) {
      registros.push({
        codigofacturacion: '',
        nombre: fam.padre.nombre,
        seccion: '',
        importe: fam.padreComedor.totalImporte,
        estaExento: fam.padreComedor.estaExento
      });
    }
  });

  registros.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  const sheetData: any[][] = [
    ['', 'Alumnos', '', '', '', 'Totales', 'COMIDAS'],
    ['', 'Nombre', 'Secciones', 'Matrícula', 'Act. y serv.', 'Totales', 'Importe'],
    ['', '', '', '', '', '', '02a900a1-88b6-7031-1eac-22102b3ede08']
  ];

  registros.forEach(reg => {
    sheetData.push([
      reg.codigofacturacion,
      reg.nombre,
      reg.seccion,
      '',
      '',
      '',
      reg.importe.toFixed(2).replace('.', ',')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Combinar celdas B1:E1 (columnas 1-4, fila 0)
  ws['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } }
  ];

  ws['!cols'] = [
    { wch: 15 },
    { wch: 35 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 }
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Aplicar estilos a la fila 0 (nueva fila superior)
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: "2C3E50" } },
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Aplicar estilos a la fila 1 (cabeceras originales)
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 1, c: C });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: "2C3E50" } },
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Aplicar estilos a la fila 2 (fila con UUID)
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 2, c: C });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: "2C3E50" } },
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, 'Facturación');

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Facturacion_Alumnos_${mesNombre.replace(' ', '_')}_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalRegistros: registros.length
  };
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

    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < hijosIds.length; i += BATCH_SIZE) {
      batches.push(hijosIds.slice(i, i + BATCH_SIZE));
    }

    let todasInscripciones: any[] = [];
    let todasBajas: any[] = [];
    let todasSolicitudes: any[] = [];
    let todasInvitaciones: any[] = [];
    let todasRestricciones: any[] = [];

    for (const batch of batches) {
      const [inscripRes, bajasRes, solicitudesRes, invitacionesRes, restriccionesRes] = await Promise.all([
        supabase.from('comedor_inscripciones').select('*').in('hijo_id', batch),
        supabase.from('comedor_bajas').select('*').in('hijo_id', batch),
        supabase.from('comedor_altaspuntuales').select('*').in('hijo_id', batch).eq('estado', 'aprobada'),
        supabase.from('invitaciones_comedor').select('*').in('hijo_id', batch).gte('fecha', fechaInicio).lte('fecha', fechaFin),
        supabase.from('hijos_restricciones_dieteticas').select(`
          hijo_id,
          restricciones_dieteticas (
            nombre,
            tipo
          )
        `).in('hijo_id', batch)
      ]);

      if (inscripRes.error) throw inscripRes.error;
      if (bajasRes.error) throw bajasRes.error;
      if (solicitudesRes.error) throw solicitudesRes.error;
      if (invitacionesRes.error) throw invitacionesRes.error;
      if (restriccionesRes.error) throw restriccionesRes.error;

      todasInscripciones = todasInscripciones.concat(inscripRes.data || []);
      todasBajas = todasBajas.concat(bajasRes.data || []);
      todasSolicitudes = todasSolicitudes.concat(solicitudesRes.data || []);
      todasInvitaciones = todasInvitaciones.concat(invitacionesRes.data || []);
      todasRestricciones = todasRestricciones.concat(restriccionesRes.data || []);
    }

    const inscripciones = todasInscripciones.filter(i => {
      const inicio = new Date(i.fecha_inicio);
      const fin = i.fecha_fin ? new Date(i.fecha_fin) : null;
      return inicio <= ultimoDia && (!fin || fin >= primerDia);
    });

    const solicitudesFiltradas = todasSolicitudes.filter(s => {
      const fechaSolicitud = s.fecha;
      return fechaSolicitud >= fechaInicio && fechaSolicitud <= fechaFin;
    });

    const bajasPorHijoYFecha: Record<string, Set<string>> = {};
    todasBajas.forEach(baja => {
      if (!baja.dias || !Array.isArray(baja.dias)) return;
      baja.dias.forEach((fechaBaja: string) => {
        if (fechaBaja >= fechaInicio && fechaBaja <= fechaFin) {
          const key = `${baja.hijo_id}_${fechaBaja}`;
          if (!bajasPorHijoYFecha[baja.hijo_id]) {
            bajasPorHijoYFecha[baja.hijo_id] = new Set();
          }
          bajasPorHijoYFecha[baja.hijo_id].add(fechaBaja);
        }
      });
    });

    const bajas = bajasPorHijoYFecha;
    const solicitudes = solicitudesFiltradas;
    const invitaciones = todasInvitaciones;

    const { data: invitacionesExternas, error: externosError } = await supabase
      .from('invitaciones_comedor')
      .select(`
        fecha,
        nombre_completo,
        motivo,
        restricciones_ids
      `)
      .not('nombre_completo', 'is', null)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha');

    if (externosError) throw externosError;

    const invitadosExternosConRestricciones: any[] = [];
    if (invitacionesExternas && invitacionesExternas.length > 0) {
      const restriccionesIdsUnicos = [...new Set(
        invitacionesExternas
          .filter(inv => inv.restricciones_ids && inv.restricciones_ids.length > 0)
          .flatMap(inv => inv.restricciones_ids)
      )];

      let restriccionesMap = new Map<string, string>();
      if (restriccionesIdsUnicos.length > 0) {
        const { data: restriccionesData, error: restriccionesExtError } = await supabase
          .from('restricciones_dieteticas')
          .select('id, nombre')
          .in('id', restriccionesIdsUnicos);

        if (restriccionesExtError) throw restriccionesExtError;

        restriccionesData?.forEach(r => {
          restriccionesMap.set(r.id, r.nombre);
        });
      }

      invitadosExternosConRestricciones.push(...invitacionesExternas.map(inv => ({
        ...inv,
        restricciones: inv.restricciones_ids?.map(id => restriccionesMap.get(id)).filter(Boolean) || []
      })));
    }

    const restriccionesPorHijo: Record<string, string[]> = {};
    todasRestricciones.forEach((r: any) => {
      if (!restriccionesPorHijo[r.hijo_id]) {
        restriccionesPorHijo[r.hijo_id] = [];
      }
      if (r.restricciones_dieteticas?.nombre) {
        restriccionesPorHijo[r.hijo_id].push(r.restricciones_dieteticas.nombre);
      }
    });

    const { data: festivos, error: festivosError } = await supabase
      .from('dias_festivos')
      .select('fecha')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .eq('activo', true);

    if (festivosError) throw festivosError;

    const festivosSet = new Set(festivos?.map(f => f.fecha) || []);

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
            row.push('S');
            continue;
          }

          const fechaStr = `${year}-${month.padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

          const esFestivo = festivosSet.has(fechaStr);

          if (esFestivo) {
            row.push('F');
            continue;
          }

          row.push('');
        }

        sheetData.push(row);
      });

      if (invitadosExternosConRestricciones.length > 0) {
        sheetData.push([]);
        sheetData.push([]);
        sheetData.push(['INVITADOS EXTERNOS DEL MES']);
        sheetData.push(['Fecha', 'Nombre', 'Restricciones Dietéticas', 'Motivo']);

        invitadosExternosConRestricciones.forEach(externo => {
          const fecha = new Date(externo.fecha + 'T00:00:00');
          const fechaFormato = fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            weekday: 'short'
          });
          const restriccionesTexto = externo.restricciones.length > 0
            ? externo.restricciones.join(', ')
            : 'Ninguna';

          sheetData.push([
            fechaFormato,
            externo.nombre_completo,
            restriccionesTexto,
            externo.motivo
          ]);
        });
      }

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

      for (let R = 0; R <= range.e.r; R++) {
        for (let C = 0; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          const cell = ws[cellAddress];

          if (R === 0 || R === 1 || R === 2) {
            cell.s = {
              fill: { fgColor: { rgb: "2C3E50" } },
              font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          } else if (cell.v) {
            const baseStyle = {
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } }
              }
            };

            switch (cell.v) {
              case 'X':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "4A90E2" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 }
                };
                break;
              case 'C':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "E74C3C" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 }
                };
                break;
              case 'P':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "27AE60" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 }
                };
                break;
              case 'I':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "9B59B6" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 }
                };
                break;
              case 'F':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "F39C12" } },
                  font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 }
                };
                break;
              case 'S':
                cell.s = {
                  ...baseStyle,
                  fill: { fgColor: { rgb: "FFF9C4" } },
                  font: { color: { rgb: "F57C00" }, bold: true, sz: 11 }
                };
                break;
              default:
                if (C < 3) {
                  cell.s = {
                    ...baseStyle,
                    alignment: { horizontal: "left", vertical: "center" },
                    font: { sz: 10 }
                  };
                } else {
                  cell.s = baseStyle;
                }
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
