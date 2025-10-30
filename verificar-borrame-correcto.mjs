import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== VERIFICACION COMPLETA DE INVITACIONES 2025 ===\n');

console.log('1. Contando hijos en la base de datos...');
const { count: totalHijos } = await supabase
  .from('hijos')
  .select('*', { count: 'exact', head: true });

console.log('Total de hijos: ' + (totalHijos || 0));

if (!totalHijos || totalHijos === 0) {
  console.log('\nNo hay hijos en la base de datos.');
  process.exit(0);
}

console.log('\n2. Buscando invitaciones en 2025...');
const { data: invitaciones2025, count: totalInv, error: invError } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact' })
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

if (invError) {
  console.error('Error buscando invitaciones:', invError);
  process.exit(1);
}

console.log('Total de invitaciones en 2025: ' + (totalInv || 0));

if (!invitaciones2025 || invitaciones2025.length === 0) {
  console.log('\nNo hay invitaciones registradas para 2025');
  process.exit(0);
}

console.log('\n3. Analizando invitaciones por hijo...');
const invitacionesPorHijo = {};

invitaciones2025.forEach(inv => {
  if (!invitacionesPorHijo[inv.hijo_id]) {
    invitacionesPorHijo[inv.hijo_id] = [];
  }
  invitacionesPorHijo[inv.hijo_id].push(inv.fecha);
});

console.log('Hijos con invitaciones en 2025: ' + Object.keys(invitacionesPorHijo).length);

const hijosIds = Object.keys(invitacionesPorHijo);

console.log('\n=== DETALLE POR HIJO ===\n');

for (const hijoId of hijosIds) {
  const { data: hijo } = await supabase
    .from('hijos')
    .select('nombre')
    .eq('id', hijoId)
    .single();
  
  const nombreHijo = hijo ? hijo.nombre : 'Desconocido';
  const fechasInvitaciones = invitacionesPorHijo[hijoId].sort();
  
  console.log('----------------------------------------');
  console.log('ALUMNO: ' + nombreHijo);
  console.log('ID: ' + hijoId.substring(0, 8) + '...');
  console.log('Total invitaciones: ' + fechasInvitaciones.length);
  
  const invitacionesPorMes = {};
  const invitacionesPorDiaSemana = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0};
  
  fechasInvitaciones.forEach(fecha => {
    const d = new Date(fecha + 'T00:00:00');
    const mes = d.getMonth() + 1;
    const diaSemana = d.getDay();
    
    if (!invitacionesPorMes[mes]) {
      invitacionesPorMes[mes] = 0;
    }
    invitacionesPorMes[mes]++;
    invitacionesPorDiaSemana[diaSemana]++;
  });
  
  console.log('\nPor mes:');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  for (let i = 1; i <= 12; i++) {
    const count = invitacionesPorMes[i] || 0;
    if (count > 0) {
      console.log('  ' + meses[i-1] + ': ' + count);
    }
  }
  
  console.log('\nPor dia de semana:');
  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  for (let i = 0; i <= 6; i++) {
    const count = invitacionesPorDiaSemana[i];
    if (count > 0) {
      console.log('  ' + diasNombres[i] + ': ' + count);
    }
  }
  
  let diasLaborablesEsperados = 0;
  for (let mes = 0; mes < 12; mes++) {
    const diasEnMes = new Date(2025, mes + 1, 0).getDate();
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(2025, mes, dia);
      const diaSemana = fecha.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasLaborablesEsperados++;
      }
    }
  }
  
  console.log('\nVerificacion:');
  console.log('  Dias laborables esperados (L-V): ' + diasLaborablesEsperados);
  console.log('  Invitaciones registradas: ' + fechasInvitaciones.length);
  
  if (fechasInvitaciones.length === diasLaborablesEsperados) {
    console.log('  ✓ CORRECTO: Todas las invitaciones registradas');
  } else if (fechasInvitaciones.length < diasLaborablesEsperados) {
    console.log('  ✗ FALTAN: ' + (diasLaborablesEsperados - fechasInvitaciones.length) + ' invitaciones');
  } else {
    console.log('  ⚠ SOBRAN: ' + (fechasInvitaciones.length - diasLaborablesEsperados) + ' invitaciones (posibles festivos o fines de semana)');
  }
  
  console.log('\nPrimeras 5 fechas: ' + fechasInvitaciones.slice(0, 5).join(', '));
  console.log('Ultimas 5 fechas: ' + fechasInvitaciones.slice(-5).join(', '));
  console.log('');
}

console.log('\n=== FIN DE LA VERIFICACION ===');
