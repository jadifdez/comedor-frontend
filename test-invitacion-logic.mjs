// Simulación de la función corregida
function tieneInvitacion(fecha, hijoId, padreId, invitaciones) {
  return invitaciones.some(inv => {
    if (inv.fecha !== fecha) return false;

    // Si buscamos por hijo, solo comparar hijo_id
    if (hijoId !== null) {
      return inv.hijo_id === hijoId;
    }

    // Si buscamos por padre, solo comparar padre_id
    if (padreId !== null) {
      return inv.padre_id === padreId;
    }

    // Si ambos son null, no hay coincidencia
    return false;
  });
}

console.log('=== PRUEBA DE LÓGICA DE INVITACIONES ===\n');

// Simulación: Una invitación para "HIJO DE EJEMPLO 1"
const invitaciones = [
  {
    fecha: '2025-01-15',
    hijo_id: 'hijo-1-id',
    padre_id: null,
    motivo: 'Cumpleaños'
  }
];

// Familia con 5 hijos, 3 inscritos
const hijos = [
  { id: 'hijo-1-id', nombre: 'HIJO DE EJEMPLO 1', inscrito: true },
  { id: 'hijo-2-id', nombre: 'HIJO DE EJEMPLO 2', inscrito: true },
  { id: 'hijo-3-id', nombre: 'HIJO DE EJEMPLO 3', inscrito: true },
  { id: 'hijo-4-id', nombre: 'HIJO DE EJEMPLO 4', inscrito: false },
  { id: 'hijo-5-id', nombre: 'HIJO DE EJEMPLO 5', inscrito: false }
];

console.log('Invitación registrada:');
console.log('  Fecha: 2025-01-15');
console.log('  Para: HIJO DE EJEMPLO 1');
console.log('  hijo_id:', invitaciones[0].hijo_id);
console.log('  padre_id:', invitaciones[0].padre_id || 'NULL');
console.log('');

console.log('Verificando cada hijo en la fecha 2025-01-15:\n');

hijos.forEach(hijo => {
  if (hijo.inscrito) {
    const tieneInv = tieneInvitacion('2025-01-15', hijo.id, null, invitaciones);
    console.log(`${hijo.nombre}:`);
    console.log(`  ¿Tiene invitación? ${tieneInv ? 'SÍ' : 'NO'}`);
    console.log(`  ${tieneInv ? '✗ NO SE FACTURA' : '✓ SE FACTURA'}`);
    console.log('');
  }
});

console.log('\n=== RESULTADO ESPERADO ===');
console.log('Solo HIJO DE EJEMPLO 1 debería tener invitación (no se factura)');
console.log('HIJO DE EJEMPLO 2 y 3 deberían facturarse normalmente');
console.log('');

// Contar cuántos tienen invitación
const hijosConInvitacion = hijos.filter(h => 
  h.inscrito && tieneInvitacion('2025-01-15', h.id, null, invitaciones)
);

console.log('=== VERIFICACIÓN ===');
console.log(`Hijos con invitación: ${hijosConInvitacion.length}`);
console.log(`Esperado: 1`);
console.log(`${hijosConInvitacion.length === 1 ? '✓ CORRECTO' : '✗ ERROR'}`);

if (hijosConInvitacion.length === 1) {
  console.log(`El hijo con invitación es: ${hijosConInvitacion[0].nombre}`);
}
