import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyData, DailyDiner, RestriccionDietetica } from '../hooks/useDailyManagement';

interface AttendanceData {
  grupo: string;
  tipo: 'curso' | 'personal' | 'externo';
  restricciones: Map<string, number>;
  sinRestricciones: number;
  total: number;
}

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

  const generateAttendanceSummary = () => {
    const comensalesActivos = data.comensales.filter(c => !c.cancelado_ultimo_momento);

    const restriccionesEncontradas = new Set<string>();
    comensalesActivos.forEach(comensal => {
      comensal.restricciones.forEach(restriccion => {
        restriccionesEncontradas.add(restriccion);
      });
    });

    const restriccionesDelDia = data.restricciones_activas.filter(r =>
      restriccionesEncontradas.has(r.nombre)
    );

    const gruposPorCurso = new Map<string, AttendanceData>();
    const grupoPersonal: AttendanceData = {
      grupo: 'Personal',
      tipo: 'personal',
      restricciones: new Map(),
      sinRestricciones: 0,
      total: 0
    };
    const grupoExternos: AttendanceData = {
      grupo: 'Externos',
      tipo: 'externo',
      restricciones: new Map(),
      sinRestricciones: 0,
      total: 0
    };

    restriccionesDelDia.forEach(r => {
      grupoPersonal.restricciones.set(r.nombre, 0);
      grupoExternos.restricciones.set(r.nombre, 0);
    });

    comensalesActivos.forEach(comensal => {
      if (comensal.tipo === 'padre') {
        grupoPersonal.total++;
        if (comensal.restricciones.length === 0) {
          grupoPersonal.sinRestricciones++;
        } else {
          comensal.restricciones.forEach(restriccion => {
            if (restriccionesEncontradas.has(restriccion)) {
              const current = grupoPersonal.restricciones.get(restriccion) || 0;
              grupoPersonal.restricciones.set(restriccion, current + 1);
            }
          });
        }
      } else if (comensal.tipo === 'externo') {
        grupoExternos.total++;
        if (comensal.restricciones.length === 0) {
          grupoExternos.sinRestricciones++;
        } else {
          comensal.restricciones.forEach(restriccion => {
            if (restriccionesEncontradas.has(restriccion)) {
              const current = grupoExternos.restricciones.get(restriccion) || 0;
              grupoExternos.restricciones.set(restriccion, current + 1);
            }
          });
        }
      } else {
        const curso = comensal.curso || 'Sin curso';

        if (!gruposPorCurso.has(curso)) {
          const restriccionesMap = new Map<string, number>();
          restriccionesDelDia.forEach(r => restriccionesMap.set(r.nombre, 0));

          gruposPorCurso.set(curso, {
            grupo: curso,
            tipo: 'curso',
            restricciones: restriccionesMap,
            sinRestricciones: 0,
            total: 0
          });
        }

        const grupo = gruposPorCurso.get(curso)!;
        grupo.total++;

        if (comensal.restricciones.length === 0) {
          grupo.sinRestricciones++;
        } else {
          comensal.restricciones.forEach(restriccion => {
            if (restriccionesEncontradas.has(restriccion)) {
              const current = grupo.restricciones.get(restriccion) || 0;
              grupo.restricciones.set(restriccion, current + 1);
            }
          });
        }
      }
    });

    const cursosOrdenados = Array.from(gruposPorCurso.values())
      .sort((a, b) => a.grupo.localeCompare(b.grupo));

    const todosLosGrupos: AttendanceData[] = [...cursosOrdenados];
    if (grupoPersonal.total > 0) {
      todosLosGrupos.push(grupoPersonal);
    }
    if (grupoExternos.total > 0) {
      todosLosGrupos.push(grupoExternos);
    }

    return { todosLosGrupos, restriccionesDelDia };
  };

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Menús Personalizados del Día', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  if (data.menu_summary.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Menús Personalizados', 14, yPosition);
    yPosition += 8;

    const menuTableData = data.menu_summary.map(menu => [
      menu.opcion_principal,
      menu.opcion_guarnicion,
      menu.cantidad.toString(),
      menu.comensales.join(', ')
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Plato Principal', 'Guarnición', 'Cantidad', 'Comensales']],
      body: menuTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [139, 92, 246],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center', fillColor: [243, 244, 246], fontStyle: 'bold', fontSize: 10 },
        3: { cellWidth: 75 }
      },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No hay menús personalizados para este día', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
  }

  doc.addPage();
  yPosition = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Asistencia por Curso y Restricciones', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  const { todosLosGrupos, restriccionesDelDia } = generateAttendanceSummary();

  if (todosLosGrupos.length > 0) {
    const headers = ['Curso', 'Sin Restricciones', ...restriccionesDelDia.map(r => r.nombre), 'Total'];
    const summaryData: any[][] = [];

    let totalSinRestricciones = 0;
    const totalesPorRestriccion = new Map<string, number>();
    restriccionesDelDia.forEach(r => totalesPorRestriccion.set(r.nombre, 0));

    todosLosGrupos.forEach(grupo => {
      const row = [
        grupo.grupo,
        grupo.sinRestricciones > 0 ? grupo.sinRestricciones.toString() : '-'
      ];

      restriccionesDelDia.forEach(restriccion => {
        const count = grupo.restricciones.get(restriccion.nombre) || 0;
        row.push(count > 0 ? count.toString() : '-');
        const currentTotal = totalesPorRestriccion.get(restriccion.nombre) || 0;
        totalesPorRestriccion.set(restriccion.nombre, currentTotal + count);
      });

      row.push(grupo.total.toString());
      summaryData.push(row);
      totalSinRestricciones += grupo.sinRestricciones;
    });

    const totalRow = ['TOTAL', totalSinRestricciones > 0 ? totalSinRestricciones.toString() : '-'];
    restriccionesDelDia.forEach(restriccion => {
      const total = totalesPorRestriccion.get(restriccion.nombre) || 0;
      totalRow.push(total > 0 ? total.toString() : '-');
    });
    const totalGeneral = todosLosGrupos.reduce((sum, g) => sum + g.total, 0);
    totalRow.push(totalGeneral.toString());
    summaryData.push(totalRow);

    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [251, 146, 60],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
        1: { fillColor: [240, 253, 244] }
      },
      didParseCell: (data) => {
        if (data.row.index === summaryData.length - 1) {
          data.cell.styles.fillColor = [229, 231, 235];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === headers.length - 1) {
          data.cell.styles.fillColor = [243, 244, 246];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 }
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No hay datos de asistencia disponibles', pageWidth / 2, yPosition, { align: 'center' });
  }

  doc.addPage();
  yPosition = 20;

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
