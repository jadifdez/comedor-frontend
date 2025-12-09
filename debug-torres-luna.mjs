import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugTorresLuna() {
  console.log('=== DEBUGGING TORRES LUNA ===\n');

  // 1. Buscar el hijo
  const { data: hijos, error: hijoError } = await supabase
    .from('hijos')
    .select('*')
    .ilike('nombre', '%torres%');

  console.log('HIJOS ENCONTRADOS:');
  console.log(JSON.stringify(hijos, null, 2));

  const hijo = hijos?.find(h => h.nombre.toLowerCase().includes('alejandro'));

  if (!hijo) {
    console.log('No se encontró Alejandro Torres Luna');
    return;
  }

  console.log('\nHIJO SELECCIONADO:');
  console.log(JSON.stringify(hijo, null, 2));

  if (hijoError) {
    console.error('Error buscando hijo:', hijoError);
    return;
  }


  // 2. Buscar inscripciones del hijo
  const { data: inscripciones, error: inscError } = await supabase
    .from('comedor_inscripciones')
    .select('*')
    .eq('hijo_id', hijo.id);

  console.log('INSCRIPCIONES:');
  console.log(JSON.stringify(inscripciones, null, 2));
  console.log('\n');

  // 3. Buscar altas puntuales (solicitudes)
  const { data: altas, error: altasError } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .eq('hijo_id', hijo.id);

  console.log('ALTAS PUNTUALES:');
  console.log(JSON.stringify(altas, null, 2));
  console.log('\n');

  // 3b. Buscar invitaciones para el 9 de diciembre
  const { data: invitaciones, error: invError } = await supabase
    .from('invitaciones_comedor')
    .select('*')
    .eq('hijo_id', hijo.id)
    .eq('fecha', '2025-12-09');

  console.log('INVITACIONES para 2025-12-09:');
  console.log(JSON.stringify(invitaciones, null, 2));
  console.log('\n');

  // 4. Buscar todas las invitaciones
  const { data: todasInvitaciones, error: todasInvError } = await supabase
    .from('invitaciones_comedor')
    .select('*')
    .eq('hijo_id', hijo.id);

  console.log('TODAS LAS INVITACIONES:');
  console.log(JSON.stringify(todasInvitaciones, null, 2));
  console.log('\n');

  // 5. Verificar días festivos
  const { data: festivos, error: festivosError } = await supabase
    .from('dias_festivos')
    .select('*')
    .eq('fecha', '2025-12-09');

  console.log('FESTIVOS para 2025-12-09:');
  console.log(JSON.stringify(festivos, null, 2));
  console.log('\n');

  // 6. Verificar bajas
  const { data: bajas, error: bajasError } = await supabase
    .from('comedor_bajas')
    .select('*')
    .eq('hijo_id', hijo.id);

  console.log('BAJAS:');
  console.log(JSON.stringify(bajas, null, 2));
  console.log('\n');

  // 7. Verificar el RPC que usa la facturación
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('obtener_asistencia_mes_actual_hijo', {
      p_hijo_id: hijo.id,
      p_mes: 12,
      p_anio: 2025
    });

  console.log('RPC obtener_asistencia_mes_actual_hijo:');
  console.log(JSON.stringify(rpcData, null, 2));
  console.log('\n');
}

debugTorresLuna().catch(console.error);
