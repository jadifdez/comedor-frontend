// Generar el SQL para insertar las invitaciones

const borrame1Id = 'e3d1ce47-4970-49f8-8edf-baac57ad2638';

function generarFechasLaborables2025() {
  const fechas = [];
  const inicio = new Date(2025, 0, 1);
  const fin = new Date(2025, 11, 31);

  const current = new Date(inicio);
  while (current <= fin) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      fechas.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }

  return fechas;
}

const fechas = generarFechasLaborables2025();

console.log('-- SQL para insertar ' + fechas.length + ' invitaciones');
console.log('-- Alumno: borrame1 (ID: ' + borrame1Id + ')');
console.log('');
console.log('INSERT INTO invitaciones_comedor (fecha, hijo_id, padre_id, nombre_completo, motivo, created_by)');
console.log('VALUES');

const values = fechas.map((fecha, i) => {
  const isLast = i === fechas.length - 1;
  return `  ('${fecha}', '${borrame1Id}', NULL, NULL, 'Invitación anual 2025', '00000000-0000-0000-0000-000000000000')${isLast ? ';' : ','}`;
});

console.log(values.join('\n'));
