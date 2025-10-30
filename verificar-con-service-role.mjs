import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Leer archivo .env
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('=== VERIFICACION CON SERVICE ROLE (BYPASS RLS) ===\n');
console.log('URL:', env.VITE_SUPABASE_URL ? 'OK' : 'MISSING');
console.log('SERVICE_ROLE_KEY:', env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
console.log('Usando:', env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON_KEY');
console.log('');

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

// Contar hijos
const { count: countHijos, error: errorHijos } = await supabase
  .from('hijos')
  .select('*', { count: 'exact', head: true });

console.log('Total de hijos: ' + (countHijos || 0));

if (errorHijos) {
  console.log('Error: ' + errorHijos.message);
}

// Contar invitaciones
const { count: countInv, error: errorInv } = await supabase
  .from('invitaciones_comedor')
  .select('*', { count: 'exact', head: true });

console.log('Total de invitaciones: ' + (countInv || 0));

if (errorInv) {
  console.log('Error: ' + errorInv.message);
}

// Si hay invitaciones, buscar en 2025
if (countInv && countInv > 0) {
  console.log('\n=== INVITACIONES EN 2025 ===\n');
  
  const { count: count2025 } = await supabase
    .from('invitaciones_comedor')
    .select('*', { count: 'exact', head: true })
    .gte('fecha', '2025-01-01')
    .lte('fecha', '2025-12-31');
  
  console.log('Total en 2025: ' + (count2025 || 0));
  
  if (count2025 && count2025 > 0) {
    // Obtener todas las invitaciones de 2025
    const { data: invitaciones } = await supabase
      .from('invitaciones_comedor')
      .select('*, hijos(nombre)')
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31')
      .order('fecha');
    
    // Agrupar por hijo
    const porHijo = {};
    invitaciones.forEach(inv => {
      if (!porHijo[inv.hijo_id]) {
        porHijo[inv.hijo_id] = {
          nombre: inv.hijos ? inv.hijos.nombre : 'Desconocido',
          count: 0
        };
      }
      porHijo[inv.hijo_id].count++;
    });
    
    console.log('\nHijos con invitaciones:');
    for (const [id, data] of Object.entries(porHijo)) {
      console.log('  - ' + data.nombre + ': ' + data.count + ' invitaciones');
    }
  }
}

// Buscar hijos con nombre "borrame"
console.log('\n=== BUSCANDO ALUMNOS "BORRAME" ===\n');

const { data: hijosB, error: errorB } = await supabase
  .from('hijos')
  .select('*')
  .or('nombre.ilike.%borrame%,nombre.ilike.%borra me%');

if (errorB) {
  console.log('Error: ' + errorB.message);
} else if (!hijosB || hijosB.length === 0) {
  console.log('No se encontraron alumnos con "borrame" en el nombre');
} else {
  console.log('Encontrados ' + hijosB.length + ' alumnos:');
  hijosB.forEach(h => {
    console.log('  - ' + h.nombre + ' (ID: ' + h.id.substring(0, 12) + '...)');
  });
  
  // Para cada hijo borrame, buscar sus invitaciones en 2025
  for (const hijo of hijosB) {
    console.log('\n--- Invitaciones para: ' + hijo.nombre + ' ---');
    
    const { count: countInvHijo } = await supabase
      .from('invitaciones_comedor')
      .select('*', { count: 'exact', head: true })
      .eq('hijo_id', hijo.id)
      .gte('fecha', '2025-01-01')
      .lte('fecha', '2025-12-31');
    
    console.log('Total invitaciones 2025: ' + (countInvHijo || 0));
    
    if (countInvHijo && countInvHijo > 0) {
      // Obtener las invitaciones
      const { data: invs } = await supabase
        .from('invitaciones_comedor')
        .select('fecha')
        .eq('hijo_id', hijo.id)
        .gte('fecha', '2025-01-01')
        .lte('fecha', '2025-12-31')
        .order('fecha');
      
      console.log('Primeras 5: ' + invs.slice(0, 5).map(i => i.fecha).join(', '));
      console.log('Ultimas 5: ' + invs.slice(-5).map(i => i.fecha).join(', '));
    }
  }
}

console.log('\n=== FIN ===');
