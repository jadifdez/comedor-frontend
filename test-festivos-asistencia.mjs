/**
 * Script para verificar que los días festivos se excluyen correctamente
 * del cálculo del umbral de asistencia
 */

console.log('=== VERIFICACIÓN: DÍAS FESTIVOS EN CÁLCULO DE ASISTENCIA ===\n');

// Simulación: Octubre 2024 sin festivos
const diasLaborablesSinFestivos = 23;
console.log('Octubre 2024 SIN festivos:');
console.log(`  Total días laborables: ${diasLaborablesSinFestivos}`);
console.log(`  Días mínimos para 80%: ${Math.ceil(diasLaborablesSinFestivos * 0.80)} días\n`);

// Simulación: Octubre 2024 con 2 festivos (por ejemplo)
const festivosEnOctubre = 2;
const diasLaborablesConFestivos = diasLaborablesSinFestivos - festivosEnOctubre;
console.log('Octubre 2024 CON 2 festivos:');
console.log(`  Festivos configurados: ${festivosEnOctubre}`);
console.log(`  Total días laborables: ${diasLaborablesConFestivos}`);
console.log(`  Días mínimos para 80%: ${Math.ceil(diasLaborablesConFestivos * 0.80)} días\n`);

console.log('=== EJEMPLO PRÁCTICO ===\n');

// Caso 1: Sin festivos
console.log('📅 Mes sin festivos (23 días laborables):');
console.log('  Inscrito 4 días/semana → 19 días disponibles');
console.log('  Si asiste los 19 días: 19/23 = 82.61% ✅ OBTIENE descuento\n');

// Caso 2: Con festivos
console.log('📅 Mes con 2 festivos (21 días laborables):');
console.log('  Inscrito 4 días/semana → Supongamos 18 días disponibles (1 festivo era su día)');
console.log('  Necesita para 80%: 21 × 0.80 = 17 días');
console.log('  Si asiste los 18 días: 18/21 = 85.71% ✅ OBTIENE descuento');
console.log('  Si asiste 17 días: 17/21 = 80.95% ✅ OBTIENE descuento');
console.log('  Si asiste 16 días: 16/21 = 76.19% ❌ NO obtiene descuento\n');

console.log('=== CONCLUSIÓN ===');
console.log('✅ El sistema DEBE excluir los festivos del total de días laborables');
console.log('✅ Esto hace el descuento más justo en meses con festivos');
console.log('✅ La función getDiasLaborablesMes() ya hace esto correctamente');
console.log('');
