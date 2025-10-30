import * as XLSX from 'xlsx';
import { FacturacionPadre } from '../hooks/useFacturacionAdmin';

interface ExcelExportOptions {
  mesSeleccionado: string;
  facturacion: FacturacionPadre[];
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

    if (famFacturacion.padreComedor && famFacturacion.padreComedor.totalImporte > 0) {
      familiaData.push(['COMEDOR DEL PADRE/MADRE (PERSONAL DEL COLEGIO)']);
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

  const fechaActual = new Date().toISOString().split('T')[0];
  const nombreArchivo = `Facturacion_${mesNombre.replace(' ', '_')}_${fechaActual}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);

  return {
    nombreArchivo,
    totalFamilias,
    totalGeneral
  };
}
