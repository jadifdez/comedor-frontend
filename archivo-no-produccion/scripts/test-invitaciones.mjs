import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvitaciones() {
  console.log('=== PROBANDO INVITACIONES ===\n');

  // Obtener invitaciones de enero 2025
  const year = 2025;
  const month = 1;
  const fechaInicioMes = `${year}-${String(month).padStart(2, '0')}-01`;
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

  console.log('Buscando invitaciones entre:', fechaInicioMes, 'y', fechaFinMes);

  const { data: invitaciones, error } = await supabase
    .from('invitaciones_comedor')
    .select('*')
    .gte('fecha', fechaInicioMes)
    .lte('fecha', fechaFinMes);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nInvitaciones encontradas:', invitaciones?.length || 0);

  if (invitaciones && invitaciones.length > 0) {
    for (const inv of invitaciones) {
      console.log('\n- Fecha:', inv.fecha, '(tipo:', typeof inv.fecha + ')');
      console.log('  Hijo ID:', inv.hijo_id);
      console.log('  Padre ID:', inv.padre_id);
      console.log('  Motivo:', inv.motivo);
    }
  }

  // Ahora vamos a obtener el hijo y verificar su facturación
  if (invitaciones && invitaciones.length > 0) {
    const hijoId = invitaciones[0].hijo_id;

    if (hijoId) {
      console.log('\n=== VERIFICANDO FACTURACIÓN PARA HIJO ===');

      const { data: hijo } = await supabase
        .from('hijos')
        .select('*, grado:grados(*)')
        .eq('id', hijoId)
        .maybeSingle();

      if (hijo) {
        console.log('Hijo:', hijo.nombre);
        console.log('Grado:', hijo.grado?.nombre);

        const { data: inscripcion } = await supabase
          .from('comedor_inscripciones')
          .select('*')
          .eq('hijo_id', hijoId)
          .eq('activo', true)
          .maybeSingle();

        if (inscripcion) {
          console.log('Precio diario:', inscripcion.precio_diario, '€');
          console.log('Días semana:', inscripcion.dias_semana);

          // Simular cálculo de facturación
          const diasLaborables = [];
          for (let dia = 1; dia <= ultimoDiaMes; dia++) {
            const fecha = new Date(year, month - 1, dia);
            const diaSemana = fecha.getDay();
            if (diaSemana >= 1 && diaSemana <= 5) {
              const fechaStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              diasLaborables.push(fechaStr);
            }
          }

          console.log('\nDías laborables en enero:', diasLaborables.length);

          let diasFacturables = 0;
          let diasConInvitacion = 0;

          for (const fecha of diasLaborables) {
            const fechaDate = new Date(fecha + 'T00:00:00');
            const diaSemana = fechaDate.getDay();
            const fechaInicio = new Date(inscripcion.fecha_inicio + 'T00:00:00');
            const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin + 'T00:00:00') : null;

            // Verificar si tiene invitación
            const tieneInvitacion = invitaciones.some(inv => inv.fecha === fecha && inv.hijo_id === hijoId);

            if (tieneInvitacion) {
              diasConInvitacion++;
              console.log('  - ' + fecha + ': CON INVITACIÓN (no se factura)');
            } else if (inscripcion.dias_semana.includes(diaSemana) &&
                       fechaDate >= fechaInicio &&
                       (!fechaFin || fechaDate <= fechaFin)) {
              diasFacturables++;
            }
          }

          console.log('\nDías con invitación:', diasConInvitacion);
          console.log('Días facturables:', diasFacturables);
          console.log('Total a cobrar:', (diasFacturables * inscripcion.precio_diario).toFixed(2), '€');
        }
      }
    }
  }
}

testInvitaciones().catch(console.error);
