/**
 * Script de prueba para verificar el cálculo correcto del descuento por asistencia
 */

// Simulación de la función calcularDiasEsperadosInscripcion
function calcularDiasEsperadosInscripcion(diasLaborables, inscripcion) {
  if (!inscripcion) return 0;

  const fechaInicio = new Date(inscripcion.fecha_inicio);
  const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;

  let diasEsperados = 0;

  for (const fecha of diasLaborables) {
    const fechaDate = new Date(fecha);
    const diaSemana = fechaDate.getDay();

    // Verificar si el día de la semana está en la inscripción
    if (!inscripcion.dias_semana.includes(diaSemana)) continue;

    // Verificar si está dentro del rango de fechas de la inscripción
    if (fechaDate >= fechaInicio && (!fechaFin || fechaDate <= fechaFin)) {
      diasEsperados++;
    }
  }

  return diasEsperados;
}

// Generar días laborables de octubre 2024
function generarDiasLaborablesOctubre2024() {
  const diasLaborables = [];
  const year = 2024;
  const month = 10; // Octubre

  for (let dia = 1; dia <= 31; dia++) {
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay();

    // Solo días de lunes a viernes
    if (diaSemana >= 1 && diaSemana <= 5) {
      const fechaStr = `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      diasLaborables.push(fechaStr);
    }
  }

  return diasLaborables;
}

console.log('=== TEST DE CÁLCULO DE ASISTENCIA PARA LAIA MATEO ===\n');

// Días laborables de octubre 2024
const diasLaborables = generarDiasLaborablesOctubre2024();
console.log(`Total de días laborables en octubre 2024: ${diasLaborables.length}`);
console.log(`Días: ${diasLaborables.join(', ')}\n`);

// Inscripción de Laia: 4 días a la semana (ejemplo: L, M, X, J = 1,2,3,4)
const inscripcionLaia = {
  dias_semana: [1, 2, 3, 4], // Lunes, Martes, Miércoles, Jueves
  fecha_inicio: '2024-09-01',
  fecha_fin: null // Inscripción indefinida
};

// Calcular días esperados según inscripción
const diasEsperados = calcularDiasEsperadosInscripcion(diasLaborables, inscripcionLaia);
console.log(`Días que Laia DEBERÍA asistir según su inscripción (4 días/semana): ${diasEsperados}`);

// Simular días asistidos (sin bajas)
const diasAsistidos = diasEsperados; // Asumiendo asistencia perfecta
console.log(`Días que Laia REALMENTE asistió: ${diasAsistidos}`);

// Calcular porcentaje (método ANTIGUO - INCORRECTO)
const porcentajeAsistenciaIncorrecto = (diasAsistidos / diasLaborables.length) * 100;
console.log(`\n❌ Porcentaje de asistencia (método ANTIGUO - INCORRECTO):`);
console.log(`   ${diasAsistidos} asistidos / ${diasLaborables.length} días del mes = ${porcentajeAsistenciaIncorrecto.toFixed(2)}%`);

// Calcular porcentaje (método NUEVO - CORRECTO)
const porcentajeAsistenciaCorrecto = (diasAsistidos / diasEsperados) * 100;
console.log(`\n✅ Porcentaje de asistencia (método NUEVO - CORRECTO):`);
console.log(`   ${diasAsistidos} asistidos / ${diasEsperados} días esperados = ${porcentajeAsistenciaCorrecto.toFixed(2)}%`);

// Umbral configurado
const umbralAsistencia = 80;
const porcentajeDescuento = 18;

console.log(`\n=== RESULTADO ===`);
console.log(`Umbral configurado: ${umbralAsistencia}%`);
console.log(`Descuento si alcanza umbral: ${porcentajeDescuento}%\n`);

if (porcentajeAsistenciaIncorrecto >= umbralAsistencia) {
  console.log(`❌ Método antiguo: Laia SÍ obtendría descuento (${porcentajeAsistenciaIncorrecto.toFixed(2)}% >= ${umbralAsistencia}%)`);
} else {
  console.log(`❌ Método antiguo: Laia NO obtendría descuento (${porcentajeAsistenciaIncorrecto.toFixed(2)}% < ${umbralAsistencia}%)`);
}

if (porcentajeAsistenciaCorrecto >= umbralAsistencia) {
  console.log(`✅ Método nuevo: Laia SÍ obtiene descuento (${porcentajeAsistenciaCorrecto.toFixed(2)}% >= ${umbralAsistencia}%)`);
} else {
  console.log(`✅ Método nuevo: Laia NO obtiene descuento (${porcentajeAsistenciaCorrecto.toFixed(2)}% < ${umbralAsistencia}%)`);
}

console.log('\n=== CONCLUSIÓN ===');
console.log('Con el método CORRECTO, si Laia asiste todos los días que tiene inscritos,');
console.log('su porcentaje de asistencia será 100%, obteniendo el descuento del 18%.');
console.log('');
