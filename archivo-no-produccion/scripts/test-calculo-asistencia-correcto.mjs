/**
 * Script de prueba para verificar el cálculo CORRECTO del descuento por asistencia
 * Versión actualizada: El descuento se aplica al 80% de TODOS los días laborables del mes
 */

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

console.log('=== TEST DE CÁLCULO DE ASISTENCIA (MÉTODO CORRECTO) ===\n');

// Días laborables de octubre 2024
const diasLaborables = generarDiasLaborablesOctubre2024();
const totalDiasLaborables = diasLaborables.length;

console.log(`Total de días laborables en octubre 2024: ${totalDiasLaborables}`);
console.log(`Días: ${diasLaborables.join(', ')}\n`);

// Umbral configurado
const umbralAsistencia = 80;
const porcentajeDescuento = 18;
const diasMinimosParaDescuento = Math.ceil(totalDiasLaborables * (umbralAsistencia / 100));

console.log('⚙️ CONFIGURACIÓN:');
console.log(`   Umbral de asistencia: ${umbralAsistencia}%`);
console.log(`   Descuento a aplicar: ${porcentajeDescuento}%`);
console.log(`   Días mínimos para obtener descuento: ${diasMinimosParaDescuento} días (${totalDiasLaborables} × 0.${umbralAsistencia})\n`);

console.log('=== ESCENARIOS DE PRUEBA ===\n');

// Escenario 1: Inscrito 5 días/semana
console.log('📊 ESCENARIO 1: Alumno inscrito 5 días/semana');
console.log('   Días disponibles según inscripción: 23 días (todos)');
console.log('');
const escenarios1 = [
  { asiste: 23, descripcion: 'Asiste todos los días' },
  { asiste: 19, descripcion: 'Asiste 19 días (mínimo para descuento)' },
  { asiste: 18, descripcion: 'Asiste 18 días (no alcanza)' }
];

escenarios1.forEach(e => {
  const porcentaje = (e.asiste / totalDiasLaborables) * 100;
  const tieneDescuento = porcentaje >= umbralAsistencia;
  console.log(`   ${tieneDescuento ? '✅' : '❌'} ${e.descripcion}:`);
  console.log(`      ${e.asiste} / ${totalDiasLaborables} = ${porcentaje.toFixed(2)}% ${tieneDescuento ? '→ SÍ obtiene descuento' : '→ NO obtiene descuento'}`);
});

// Escenario 2: Inscrito 4 días/semana (Laia)
console.log('\n📊 ESCENARIO 2: Alumno inscrito 4 días/semana (L-M-X-J) - Caso Laia');
console.log('   Días disponibles según inscripción: 19 días');
console.log('');
const escenarios2 = [
  { asiste: 19, descripcion: 'Asiste todos sus días inscritos' },
  { asiste: 18, descripcion: 'Falta 1 día de su inscripción' },
  { asiste: 15, descripcion: 'Falta 4 días de su inscripción' }
];

escenarios2.forEach(e => {
  const porcentaje = (e.asiste / totalDiasLaborables) * 100;
  const tieneDescuento = porcentaje >= umbralAsistencia;
  console.log(`   ${tieneDescuento ? '✅' : '❌'} ${e.descripcion}:`);
  console.log(`      ${e.asiste} / ${totalDiasLaborables} = ${porcentaje.toFixed(2)}% ${tieneDescuento ? '→ SÍ obtiene descuento' : '→ NO obtiene descuento'}`);
});

// Escenario 3: Inscrito 1 día/semana
console.log('\n📊 ESCENARIO 3: Alumno inscrito 1 día/semana (solo lunes)');
console.log('   Días disponibles según inscripción: ~4-5 días');
console.log('');
const escenarios3 = [
  { asiste: 5, descripcion: 'Asiste todos sus días inscritos', extra: '' },
  { asiste: 19, descripcion: 'Asiste 5 días inscritos + 14 puntuales', extra: ' (solicitando comidas puntuales)' }
];

escenarios3.forEach(e => {
  const porcentaje = (e.asiste / totalDiasLaborables) * 100;
  const tieneDescuento = porcentaje >= umbralAsistencia;
  console.log(`   ${tieneDescuento ? '✅' : '❌'} ${e.descripcion}${e.extra}:`);
  console.log(`      ${e.asiste} / ${totalDiasLaborables} = ${porcentaje.toFixed(2)}% ${tieneDescuento ? '→ SÍ obtiene descuento' : '→ NO obtiene descuento'}`);
});

console.log('\n=== CONCLUSIÓN ===');
console.log('Con el método CORRECTO:');
console.log(`• El descuento se aplica a quien asiste al menos ${diasMinimosParaDescuento} días del mes (${umbralAsistencia}% de ${totalDiasLaborables} días).`);
console.log('• No importa cuántos días estés inscrito, lo que cuenta es la asistencia total.');
console.log('• Laia (4 días/semana) con 19 días de asistencia: 82.61% ✅ SÍ obtiene descuento.');
console.log('• Alguien inscrito 1 día/semana puede obtener el descuento solicitando comidas puntuales.');
console.log('');
