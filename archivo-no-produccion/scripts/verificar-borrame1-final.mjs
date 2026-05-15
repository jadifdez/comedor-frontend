import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== VERIFICACION DE INVITACIONES BORRAME1 EN 2025 ===\n');

const { data: hijos, error: hijosError } = await supabase
  .from('hijos')
  .select('*')
  .or('nombre.ilike.%borrame1%,nombre.ilike.%borra%');

if (hijosError) {
  console.error('Error buscando hijos:', hijosError);
  process.exit(1);
}

if (!hijos || hijos.length === 0) {
  console.log('No se encontro el alumno borrame1\n');
  
  console.log('Listando primeros 20 alumnos de la base de datos:\n');
  const { data: todosHijos } = await supabase
    .from('hijos')
    .select('id, nombre, activo')
    .limit(20);
  
  if (todosHijos) {
    todosHijos.forEach(h => {
      console.log('- ' + h.nombre + ' (ID: ' + h.id.substring(0, 8) + '...)');
    });
  }
  process.exit(0);
}

const hijo = hijos.length > 1 ? hijos.find(h => h.nombre.toLowerCase().includes('borrame1')) || hijos[0] : hijos[0];
console.log('Alumno encontrado: ' + hijo.nombre);
console.log('ID: ' + hijo.id);
console.log('Activo: ' + hijo.activo + '\n');

const { data: invitaciones, error: invError } = await supabase
  .from('invitaciones_comedor')
  .select('*')
  .eq('hijo_id', hijo.id)
  .gte('fecha', '2025-01-01')
  .lte('fecha', '2025-12-31')
  .order('fecha', { ascending: true });

if (invError) {
  console.error('Error buscando invitaciones:', invError);
  process.exit(1);
}

console.log('Total de invitaciones en 2025: ' + (invitaciones ? invitaciones.length : 0) + '\n');

if (!invitaciones || invitaciones.length === 0) {
  console.log('No hay invitaciones registradas para 2025');
  process.exit(0);
}

const invitacionesPorMes = {};
const invitacionesPorDiaSemana = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
const finesDeSemana = [];

invitaciones.forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  const mes = fecha.getMonth() + 1;
  const diaSemana = fecha.getDay();
  
  if (!invitacionesPorMes[mes]) {
    invitacionesPorMes[mes] = [];
  }
  invitacionesPorMes[mes].push(inv.fecha);
  invitacionesPorDiaSemana[diaSemana]++;
  
  if (diaSemana === 0 || diaSemana === 6) {
    finesDeSemana.push(inv.fecha);
  }
});

console.log('=== RESUMEN POR MES ===\n');
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

for (let i = 1; i <= 12; i++) {
  const count = invitacionesPorMes[i] ? invitacionesPorMes[i].length : 0;
  console.log(meses[i-1] + ': ' + count + ' invitaciones');
}

console.log('\n=== RESUMEN POR DIA DE LA SEMANA ===\n');
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
for (let i = 0; i <= 6; i++) {
  console.log(diasSemana[i] + ': ' + invitacionesPorDiaSemana[i] + ' invitaciones');
}

console.log('\n=== VERIFICACION DE DIAS LABORABLES (Lunes a Viernes) ===\n');

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

const diasLaborablesRegistrados = invitacionesPorDiaSemana[1] + invitacionesPorDiaSemana[2] + invitacionesPorDiaSemana[3] + invitacionesPorDiaSemana[4] + invitacionesPorDiaSemana[5];

console.log('Dias laborables totales en 2025 (L-V): ' + diasLaborablesEsperados);
console.log('Invitaciones en dias laborables: ' + diasLaborablesRegistrados);
console.log('Invitaciones en fines de semana: ' + finesDeSemana.length);
console.log('Total de invitaciones: ' + invitaciones.length);
console.log('Diferencia: ' + (diasLaborablesEsperados - diasLaborablesRegistrados));

if (diasLaborablesRegistrados === diasLaborablesEsperados) {
  console.log('\n✓ CORRECTO: Se han registrado todos los dias laborables del año 2025');
} else if (diasLaborablesRegistrados < diasLaborablesEsperados) {
  console.log('\n✗ FALTAN: ' + (diasLaborablesEsperados - diasLaborablesRegistrados) + ' dias laborables');
} else {
  console.log('\n✗ SOBRAN: ' + (diasLaborablesRegistrados - diasLaborablesEsperados) + ' invitaciones en dias laborables');
}

if (finesDeSemana.length > 0) {
  console.log('\n⚠ ADVERTENCIA: Hay ' + finesDeSemana.length + ' invitaciones en fines de semana:');
  finesDeSemana.slice(0, 10).forEach(fecha => {
    const d = new Date(fecha + 'T00:00:00');
    const diaNombre = d.getDay() === 0 ? 'Domingo' : 'Sabado';
    console.log('  - ' + fecha + ' (' + diaNombre + ')');
  });
  if (finesDeSemana.length > 10) {
    console.log('  ... y ' + (finesDeSemana.length - 10) + ' mas');
  }
}

console.log('\n=== COMPARACION DETALLADA POR MES ===\n');
for (let i = 1; i <= 12; i++) {
  const esperados = diasLaborablesPorMes[i];
  const registrados = invitacionesPorMes[i] ? invitacionesPorMes[i].length : 0;
  const diferencia = esperados - registrados;
  const status = diferencia === 0 ? '✓' : '✗';
  const mensaje = diferencia === 0 ? 'completo' : (diferencia > 0 ? 'faltan ' + diferencia : 'sobran ' + (-diferencia));
  console.log(status + ' ' + meses[i-1] + ': ' + registrados + '/' + esperados + ' dias (' + mensaje + ')');
}

console.log('\n=== PRIMERAS 10 INVITACIONES ===\n');
invitaciones.slice(0, 10).forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  console.log(inv.fecha + ' (' + diasSemana[fecha.getDay()] + ')');
});

console.log('\n=== ULTIMAS 10 INVITACIONES ===\n');
invitaciones.slice(-10).forEach(inv => {
  const fecha = new Date(inv.fecha + 'T00:00:00');
  console.log(inv.fecha + ' (' + diasSemana[fecha.getDay()] + ')');
});

console.log('\n=== FIN DE LA VERIFICACION ===');
