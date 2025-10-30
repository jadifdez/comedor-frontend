import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyData, DailyDiner } from '../hooks/useDailyManagement';

export function generateDailyPDF(data: DailyData, selectedDate: Date) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  const formatTime = () => {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupByGrado = (comensales: DailyDiner[]) => {
    const grouped = new Map<string, DailyDiner[]>();
    comensales.forEach(c => {
      const grado = c.curso || 'Sin curso';
      if (!grouped.has(grado)) {
        grouped.set(grado, []);
      }
      grouped.get(grado)!.push(c);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const alumnos = data.comensales.filter(c => c.tipo === 'hijo');
  const gradosAgrupados = groupByGrado(alumnos);

  gradosAgrupados.forEach(([grado, alumnosGrado], index) => {
    if (index > 0) {
      doc.addPage();
    }
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${grado} (${alumnosGrado.length} alumnos)`, 14, yPosition);
    yPosition += 10;

    const alumnosTableData = alumnosGrado.map(alumno => {
      let menu = '';
      if (alumno.tiene_dieta_blanda) {
        menu = 'DIETA BLANDA';
      } else if (alumno.tiene_eleccion) {
        menu = `${alumno.opcion_principal} + ${alumno.opcion_guarnicion}`;
      } else {
        menu = 'Menú Rancho';
      }

      const tipo = alumno.es_invitacion ? 'Invitado' : 'Inscrito';
      const restricciones = alumno.restricciones.length > 0 ? alumno.restricciones.join(', ') : '-';

      return [alumno.nombre, restricciones, menu, tipo];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Alumno', 'Alergias/Restricciones', 'Menú', 'Tipo']],
      body: alumnosTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.cell.raw === 'DIETA BLANDA') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 1 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });
  });

  const personal = data.comensales.filter(c => c.tipo === 'padre');
  if (personal.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Personal del Colegio (${personal.length} personas)`, 14, yPosition);
    yPosition += 10;

    const personalTableData = personal.map(p => {
      let menu = '';
      if (p.tiene_dieta_blanda) {
        menu = 'DIETA BLANDA';
      } else if (p.tiene_eleccion) {
        menu = `${p.opcion_principal} + ${p.opcion_guarnicion}`;
      } else {
        menu = 'Menú Rancho';
      }

      const tipo = p.es_invitacion ? 'Invitado' : 'Inscrito';
      const restricciones = p.restricciones.length > 0 ? p.restricciones.join(', ') : '-';

      return [p.nombre, restricciones, menu, tipo];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Nombre', 'Alergias/Restricciones', 'Menú', 'Tipo']],
      body: personalTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 184, 166],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.cell.raw === 'DIETA BLANDA') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 1 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });
  }

  const invitaciones = data.comensales.filter(c => c.es_invitacion);
  if (invitaciones.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invitaciones del Día (${invitaciones.length})`, 14, yPosition);
    yPosition += 10;

    const invitacionesTableData = invitaciones.map(inv => {
      let menu = '';
      if (inv.tiene_dieta_blanda) {
        menu = 'DIETA BLANDA';
      } else if (inv.tiene_eleccion) {
        menu = `${inv.opcion_principal} + ${inv.opcion_guarnicion}`;
      } else {
        menu = 'Menú Rancho';
      }

      const tipo = inv.tipo === 'hijo' ? 'Alumno' : inv.tipo === 'padre' ? 'Personal' : 'Externo';
      const curso = inv.curso || '-';
      const motivo = inv.motivo_invitacion || '-';
      const restricciones = inv.restricciones.length > 0 ? inv.restricciones.join(', ') : '-';

      return [inv.nombre, restricciones, curso, tipo, motivo, menu];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Nombre', 'Alergias/Restricciones', 'Curso', 'Tipo', 'Motivo', 'Menú']],
      body: invitacionesTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [236, 72, 153],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 35 },
        5: { cellWidth: 40 }
      },
      didParseCell: (data) => {
        if (data.cell.raw === 'DIETA BLANDA') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 1 && data.cell.raw !== '-') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-ES')} ${formatTime()}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const fileName = `Parte_Diario_${selectedDate.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
