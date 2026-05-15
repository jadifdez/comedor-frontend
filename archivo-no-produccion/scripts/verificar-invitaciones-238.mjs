import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== VERIFICACION COMPLETA DE INVITACIONES 2025 ===\n');

// Primero verificar que hay datos
const { count: totalInvitaciones } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact', head: true })
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31');

console.log('Total de invitaciones en 2025: ' + (totalInvitaciones || 0) + '\n');

if (!totalInvitaciones || totalInvitaciones === 0) {
  console.log('No hay invitaciones en la base de datos para 2025.');
  
  // Verificar si hay invitaciones en general
  const { count: totalGeneral } = await supabase
    .from('invitaciones_comedor')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total de invitaciones en general: ' + (totalGeneral || 0));
  process.exit(0);
}

// Obtener todas las invitaciones
const { data: invitaciones, error } = await supabase
  .from('invitaciones_comedor')
  .select('*, hijos(nombre)')
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31')
  .order('fecha', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Agrupar por hijo
const invitacionesPorHijo = {};

invitaciones.forEach(inv => {
  if (!invitacionesPorHijo[inv.hijo_id]) {
    invitacionesPorHijo[inv.hijo_id] = {
      nombre: inv.hijos ? inv.hijos.nombre : 'Desconocido',
      fechas: []
    };
  }
  invitacionesPorHijo[inv.hijo_id].fechas.push(inv.fecha);
});

console.log('Hijos con invitaciones en 2025: ' + Object.keys(invitacionesPorHijo).length + '\n');

// Calcular dias laborables esperados en 2025
let diasLaborablesEsperados = 0;
let diasLaborablesPorMes = {};

for (let mes = 0; mes < 12; mes++) {
  diasLaborablesPorMes[mes + 1] = 0;
  const diasEnMes = new Date(2025, mes + 1, 0).getDate();
  
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(2025, mes, dia);
    const diaSemana = fecha.getDay();
    
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborablesEsperados++;
      diasLaborablesPorMes[mes + 1]++;
    }
  }
}

console.log('=== DIAS LABORABLES ESPERADOS EN 2025 (Lunes a Viernes) ===\n');
console.log('Total anual: ' + diasLaborablesEsperados + ' dias\n');

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
for (let i = 1; i <= 12; i++) {
  console.log(meses[i-1] + ': ' + diasLaborablesPorMes[i] + ' dias');
}

console.log('\n=== ANALISIS POR ALUMNO ===\n');

for (const [hijoId, datos] of Object.entries(invitacionesPorHijo)) {
  console.log('----------------------------------------');
  console.log('ALUMNO: ' + datos.nombre);
  console.log('ID: ' + hijoId.substring(0, 12) + '...');
  console.log('Total invitaciones: ' + datos.fechas.length);
  
  // Analisis por mes
  const invPorMes = {};
  const invPorDiaSemana = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
  const finesDeSemana = [];
  
  datos.fechas.forEach(fecha => {
    const d = new Date(fecha + 'T00:00:00');
    const mes = d.getMonth() + 1;
    const diaSemana = d.getDay();
    
    if (!invPorMes[mes]) invPorMes[mes] = 0;
    invPorMes[mes]++;
    invPorDiaSemana[diaSemana]++;
    
    if (diaSemana === 0 || diaSemana === 6) {
      finesDeSemana.push(fecha);
    }
  });
  
  const diasLaborablesRegistrados = invPorDiaSemana[1] + invPorDiaSemana[2] + invPorDiaSemana[3] + invPorDiaSemana[4] + invPorDiaSemana[5];
  
  console.log('\nInvitaciones por dia de semana:');
  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  for (let i = 0; i <= 6; i++) {
    if (invPorDiaSemana[i] > 0) {
      console.log('  ' + diasNombres[i] + ': ' + invPorDiaSemana[i]);
    }
  }
  
  console.log('\nComparacion con dias laborables esperados:');
  console.log('  Esperados (L-V): ' + diasLaborablesEsperados);
  console.log('  Registrados (L-V): ' + diasLaborablesRegistrados);
  console.log('  Diferencia: ' + (diasLaborablesEsperados - diasLaborablesRegistrados));
  
  if (diasLaborablesRegistrados === diasLaborablesEsperados) {
    console.log('  ✓✓✓ CORRECTO: Tiene TODOS los dias laborables del año ✓✓✓');
  } else if (diasLaborablesRegistrados < diasLaborablesEsperados) {
    console.log('  ✗✗✗ ERROR: FALTAN ' + (diasLaborablesEsperados - diasLaborablesRegistrados) + ' dias ✗✗✗');
  } else {
    console.log('  ✗✗✗ ERROR: SOBRAN ' + (diasLaborablesRegistrados - diasLaborablesEsperados) + ' dias ✗✗✗');
  }
  
  if (finesDeSemana.length > 0) {
    console.log('\n  ⚠⚠⚠ ADVERTENCIA: ' + finesDeSemana.length + ' invitaciones en FINES DE SEMANA ⚠⚠⚠');
    console.log('  Primeras 5: ' + finesDeSemana.slice(0, 5).join(', '));
  } else {
    console.log('\n  ✓ Sin invitaciones en fines de semana');
  }
  
  console.log('\nComparacion por mes:');
  for (let i = 1; i <= 12; i++) {
    const esperados = diasLaborablesPorMes[i];
    const registrados = invPorMes[i] || 0;
    const dif = esperados - registrados;
    const status = dif === 0 ? '✓' : '✗';
    const msg = dif === 0 ? 'OK' : (dif > 0 ? 'FALTAN ' + dif : 'SOBRAN ' + (-dif));
    console.log('  ' + status + ' ' + meses[i-1].padEnd(12) + ': ' + registrados + '/' + esperados + ' (' + msg + ')');
  }
  
  console.log('\nPrimeras 5 fechas: ' + datos.fechas.slice(0, 5).join(', '));
  console.log('Ultimas 5 fechas: ' + datos.fechas.slice(-5).join(', '));
  console.log('');
}

console.log('\n=== RESUMEN GENERAL ===');
console.log('Total invitaciones en 2025: ' + totalInvitaciones);
console.log('Alumnos con invitaciones: ' + Object.keys(invitacionesPorHijo).length);
console.log('Dias laborables esperados por alumno: ' + diasLaborablesEsperados);

// Verificar si algun alumno tiene las 261 invitaciones
const alumnosCompletos = Object.entries(invitacionesPorHijo).filter(([id, datos]) => {
  const invPorDiaSemana = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  datos.fechas.forEach(fecha => {
    const d = new Date(fecha + 'T00:00:00');
    const diaSemana = d.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) {
      invPorDiaSemana[diaSemana]++;
    }
  });
  const total = invPorDiaSemana[1] + invPorDiaSemana[2] + invPorDiaSemana[3] + invPorDiaSemana[4] + invPorDiaSemana[5];
  return total === diasLaborablesEsperados;
});

if (alumnosCompletos.length > 0) {
  console.log('\n✓ Alumnos con registro COMPLETO: ' + alumnosCompletos.length);
  alumnosCompletos.forEach(([id, datos]) => {
    console.log('  - ' + datos.nombre);
  });
} else {
  console.log('\n✗ Ningun alumno tiene el registro completo de 261 dias');
}

console.log('\n=== FIN DE LA VERIFICACION ===');
