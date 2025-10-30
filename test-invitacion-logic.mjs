// Test de la función generarFechasRecurrentes corregida

function generarFechasRecurrentes(diasSemana, fechaInicio, fechaFin) {
  const fechas = [];

  // Parse dates properly to avoid timezone issues
  const [startYear, startMonth, startDay] = fechaInicio.split('-').map(Number);
  const [endYear, endMonth, endDay] = fechaFin.split('-').map(Number);

  const inicio = new Date(startYear, startMonth - 1, startDay);
  const fin = new Date(endYear, endMonth - 1, endDay);

  // Sort days of week to process in order
  const diasOrdenados = [...diasSemana].sort((a, b) => a - b);

  diasOrdenados.forEach(diaSemana => {
    // Start from the beginning date
    const current = new Date(inicio);

    // Find the first occurrence of this day of week
    while (current.getDay() !== diaSemana) {
      current.setDate(current.getDate() + 1);
    }

    // Generate all occurrences of this day until end date
    while (current <= fin) {
      // Format date as YYYY-MM-DD
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const fechaStr = `${year}-${month}-${day}`;

      if (!fechas.includes(fechaStr)) {
        fechas.push(fechaStr);
      }

      // Move to next week
      current.setDate(current.getDate() + 7);
    }
  });

  return fechas.sort();
}

console.log('=== TEST: Generación de Fechas Recurrentes ===\n');

// Test 1: Todo el año 2025, solo días laborables (L-V = 1-5)
console.log('TEST 1: Todo 2025, Lunes a Viernes');
const fechas2025 = generarFechasRecurrentes(
  [1, 2, 3, 4, 5], // L-V
  '2025-01-01',
  '2025-12-31'
);

console.log('Total de fechas generadas: ' + fechas2025.length);
console.log('Primera fecha: ' + fechas2025[0]);
console.log('Última fecha: ' + fechas2025[fechas2025.length - 1]);

// Verificar que no hay fines de semana
let finesdeSemana = 0;
fechas2025.forEach(fecha => {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) {
    finesdeSemana++;
  }
});

console.log('Fines de semana encontrados: ' + finesdeSemana + ' (debería ser 0)');

// Contar por día de semana
const porDia = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
fechas2025.forEach(fecha => {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  if (dow >= 1 && dow <= 5) {
    porDia[dow]++;
  }
});

console.log('\nDistribución por día:');
const nombres = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
for (let i = 1; i <= 5; i++) {
  console.log('  ' + nombres[i] + ': ' + porDia[i]);
}

// Contar por mes
const porMes = {};
fechas2025.forEach(fecha => {
  const mes = fecha.substring(0, 7); // YYYY-MM
  if (!porMes[mes]) porMes[mes] = 0;
  porMes[mes]++;
});

console.log('\nDistribución por mes:');
for (let i = 1; i <= 12; i++) {
  const mesKey = '2025-' + String(i).padStart(2, '0');
  console.log('  ' + mesKey + ': ' + (porMes[mesKey] || 0) + ' días');
}

console.log('\nPrimeras 10 fechas:');
fechas2025.slice(0, 10).forEach(f => {
  const [y, m, d] = f.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  console.log('  ' + f + ' (' + dias[date.getDay()] + ')');
});

console.log('\n=== RESULTADO ===');
if (finesdeSemana === 0 && fechas2025[0] === '2025-01-01' && fechas2025.length === 261) {
  console.log('✓ CORRECTO: La función genera exactamente 261 días laborables de 2025');
  console.log('✓ Sin fines de semana');
  console.log('✓ Comienza el 1 de enero');
} else {
  console.log('✗ ERROR: La función NO genera las fechas correctamente');
  if (fechas2025[0] !== '2025-01-01') {
    console.log('  - Primera fecha incorrecta: ' + fechas2025[0] + ' (esperado: 2025-01-01)');
  }
  if (finesdeSemana > 0) {
    console.log('  - Incluye ' + finesdeSemana + ' fines de semana');
  }
  if (fechas2025.length !== 261) {
    console.log('  - Total incorrecto: ' + fechas2025.length + ' (esperado: 261)');
  }
}

console.log('\n=== FIN DEL TEST ===');
