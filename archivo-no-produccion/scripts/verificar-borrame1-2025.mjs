import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iilgvjlbrwfvwkslmhfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbGd2amxicndmdndrc2xtaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTI3MjQsImV4cCI6MjA3NDE4ODcyNH0.8v3ygj_4qN2151PBTy3QKaENKdPgl7BXEWRNn9fTe2w'
);

console.log('=== VERIFICACION DE INVITACIONES PARA BORRAME1 EN 2025 ===\n');

const { data: hijos, error: hijosError } = await supabase
  .from('hijos')
  .select('*')
  .ilike('nombre', '%borrame1%');

if (hijosError) {
  console.error('Error buscando hijo:', hijosError);
  process.exit(1);
}

if (!hijos || hijos.length === 0) {
  console.log('No se encontro el alumno borrame1');
  process.exit(0);
}

const hijo = hijos[0];
console.log('Alumno encontrado: ' + hijo.nombre);
console.log('ID: ' + hijo.id + '\n');

const { data: invitaciones, error: invError } = await supabase
  .from('invitaciones')
  .select('*')
  .eq('hijo_id', hijo.id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31')
  .order('fecha', { ascending: true });

if (invError) {
  console.error('Error buscando invitaciones:', invError);
  process.exit(1);
}

const totalInvitaciones = (invitaciones && invitaciones.length) || 0;
console.log('Total de invitaciones en 2025: ' + totalInvitaciones + '\n');

if (!invitaciones || invitaciones.length === 0) {
  console.log('No hay invitaciones registradas para 2025');
  process.exit(0);
}

const invitacionesPorMes = {};
const invitacionesPorDiaSemana = {
  1: [], 2: [], 3: [], 4: [], 5: []
};

invitaciones.forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  const mes = fecha.getMonth() + 1;
  const diaSemana = fecha.getDay();
  const diaSemanaAjustado = diaSemana === 0 ? 7 : diaSemana;
  
  if (!invitacionesPorMes[mes]) {
    invitacionesPorMes[mes] = [];
  }
  invitacionesPorMes[mes].push(inv.fecha);
  
  if (diaSemanaAjustado >= 1 && diaSemanaAjustado <= 5) {
    invitacionesPorDiaSemana[diaSemanaAjustado].push(inv.fecha);
  }
});

console.log('=== RESUMEN POR MES ===\n');
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

for (let i = 1; i <= 12; i++) {
  const count = (invitacionesPorMes[i] && invitacionesPorMes[i].length) || 0;
  console.log(meses[i-1] + ': ' + count + ' invitaciones');
}

console.log('\n=== RESUMEN POR DIA DE LA SEMANA ===\n');
const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
for (let i = 1; i <= 5; i++) {
  console.log(diasSemana[i-1] + ': ' + invitacionesPorDiaSemana[i].length + ' invitaciones');
}

console.log('\n=== VERIFICACION DE DIAS LABORABLES ===\n');

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

console.log('Dias laborables totales en 2025 (lunes a viernes): ' + diasLaborablesEsperados);
console.log('Invitaciones registradas: ' + invitaciones.length);
console.log('Diferencia: ' + (diasLaborablesEsperados - invitaciones.length));

if (invitaciones.length === diasLaborablesEsperados) {
  console.log('\n✓ CORRECTO: Se han registrado todos los dias laborables del año 2025');
} else if (invitaciones.length < diasLaborablesEsperados) {
  console.log('\n✗ FALTAN ' + (diasLaborablesEsperados - invitaciones.length) + ' dias laborables');
} else {
  console.log('\n⚠ HAY ' + (invitaciones.length - diasLaborablesEsperados) + ' invitaciones DE MAS');
}

console.log('\n=== COMPARACION DETALLADA POR MES ===\n');
for (let i = 1; i <= 12; i++) {
  const esperados = diasLaborablesPorMes[i];
  const registrados = (invitacionesPorMes[i] && invitacionesPorMes[i].length) || 0;
  const diferencia = esperados - registrados;
  const status = diferencia === 0 ? '✓' : '✗';
  const mensaje = diferencia === 0 ? 'completo' : (diferencia > 0 ? 'faltan ' + diferencia : 'sobran ' + (-diferencia));
  console.log(status + ' ' + meses[i-1] + ': ' + registrados + '/' + esperados + ' dias (' + mensaje + ')');
}

console.log('\n=== VERIFICACION DE FINES DE SEMANA ===\n');
const finesDeSemana = invitaciones.filter(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  const diaSemana = fecha.getDay();
  return diaSemana === 0 || diaSemana === 6;
});

if (finesDeSemana.length > 0) {
  console.log('⚠ Se encontraron ' + finesDeSemana.length + ' invitaciones en fines de semana:');
  finesDeSemana.forEach(inv => {
    const fecha = new Date(inv.fecha + 'T00:00:00');
    const diaNombre = fecha.getDay() === 0 ? 'Domingo' : 'Sabado';
    console.log('  - ' + inv.fecha + ' (' + diaNombre + ')');
  });
} else {
  console.log('✓ No hay invitaciones en fines de semana');
}

console.log('\n=== PRIMERAS 10 INVITACIONES ===\n');
invitaciones.slice(0, 10).forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  const diasSemanaCompleto = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  console.log(inv.fecha + ' (' + diasSemanaCompleto[fecha.getDay()] + ')');
});

console.log('\n=== ULTIMAS 10 INVITACIONES ===\n');
invitaciones.slice(-10).forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  const diasSemanaCompleto = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  console.log(inv.fecha + ' (' + diasSemanaCompleto[fecha.getDay()] + ')');
});

console.log('\n=== FIN DE LA VERIFICACION ===');
