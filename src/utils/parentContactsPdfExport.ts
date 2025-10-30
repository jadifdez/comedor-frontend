import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Hijo, Grado } from '../lib/supabase';

interface HijoWithDetails extends Hijo {
  padre?: {
    nombre: string;
    email: string;
    telefono: string | null;
  };
  grado?: Grado;
}

export async function exportParentContactsPDF(hijos: HijoWithDetails[]) {
  const doc = new jsPDF();

  const hijosActivos = hijos.filter(h => h.activo);

  const hijosPorGrado = hijosActivos.reduce((acc, hijo) => {
    if (!hijo.grado) return acc;
    const gradoNombre = hijo.grado.nombre;
    if (!acc[gradoNombre]) {
      acc[gradoNombre] = [];
    }
    acc[gradoNombre].push(hijo);
    return acc;
  }, {} as Record<string, HijoWithDetails[]>);

  const gradosOrdenados = Object.keys(hijosPorGrado).sort((a, b) => {
    const ordenMap: Record<string, number> = {
      '1º Infantil': 1,
      '2º Infantil': 2,
      '3º Infantil': 3,
      '1º Primaria': 4,
      '2º Primaria': 5,
      '3º Primaria': 6,
      '4º Primaria': 7,
      '5º Primaria': 8,
      '6º Primaria': 9,
      '1º ESO': 10,
      '2º ESO': 11,
      '3º ESO': 12,
      '4º ESO': 13,
      '1º Bachillerato': 14,
      '2º Bachillerato': 15,
    };
    return (ordenMap[a] || 999) - (ordenMap[b] || 999);
  });

  let isFirstPage = true;

  gradosOrdenados.forEach((gradoNombre, index) => {
    const hijosDelGrado = hijosPorGrado[gradoNombre];

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Colegio Los Pinos', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Lista de Contactos de Padres', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(gradoNombre, pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(`Fecha: ${fecha}`, pageWidth / 2, 48, { align: 'center' });

    const hijosOrdenados = hijosDelGrado.sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '')
    );

    const tableData = hijosOrdenados.map(hijo => [
      hijo.nombre || '-',
      hijo.padre?.nombre || '-',
      hijo.padre?.telefono || '-',
      hijo.padre?.email || '-'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Alumno', 'Padre/Madre', 'Teléfono', 'Email']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 60 }
      },
      margin: { left: 10, right: 10 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 55;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.text(
      `Total de alumnos: ${hijosDelGrado.length}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );

    doc.setFontSize(7);
    doc.text(
      `Página ${index + 1} de ${gradosOrdenados.length}`,
      pageWidth / 2,
      footerY + 5,
      { align: 'center' }
    );
  });

  const fileName = `Contactos_Padres_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
