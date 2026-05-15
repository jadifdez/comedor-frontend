// Simular exactamente lo que hace el frontend

const selectedDate = new Date('2025-12-01');
console.log('=== TEST FECHA DICIEMBRE ===\n');
console.log('1. selectedDate (Date object):', selectedDate);
console.log('2. toISOString():', selectedDate.toISOString());
console.log('3. formatDateISO:', selectedDate.toISOString().split('T')[0]);

const formatDateISO = (date) => {
  return date.toISOString().split('T')[0];
};

const formattedDate = formatDateISO(selectedDate);
console.log('\n4. Fecha pasada al hook:', formattedDate);

// Simular lo que hace el hook
const date = new Date(formattedDate + 'T00:00:00');
const diaSemana = date.getDay();

console.log('\n5. Dentro del hook:');
console.log('   - date:', date);
console.log('   - diaSemana:', diaSemana, '(0=domingo, 1=lunes)');

const [year, month, day] = formattedDate.split('-');
const fechaEspanol = `${day}/${month}/${year}`;

console.log('\n6. Formato español para altas:', fechaEspanol);

// Simular filtro de inscripciones
const fechaInicioInsc = '2025-12-01';
const fechaInicio = new Date(fechaInicioInsc);
const fechaSeleccionada = new Date(formattedDate);

console.log('\n7. Comparación de fechas para inscripciones:');
console.log('   - fechaInicio:', fechaInicio);
console.log('   - fechaSeleccionada:', fechaSeleccionada);
console.log('   - fechaInicio <= fechaSeleccionada:', fechaInicio <= fechaSeleccionada);
