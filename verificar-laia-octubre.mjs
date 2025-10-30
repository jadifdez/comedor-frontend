import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer .env manualmente
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: No se encontraron las variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarLaiaOctubre() {
  console.log('=== VERIFICACIÓN DE LAIA MATEO - OCTUBRE 2024 ===\n');

  // Buscar a Laia Mateo
  const { data: laia, error: errorLaia } = await supabase
    .from('hijos')
    .select('*, grado:grados(*)')
    .ilike('nombre', '%laia%mateo%')
    .maybeSingle();

  if (errorLaia || !laia) {
    console.error('❌ No se encontró a Laia Mateo en la base de datos');
    console.error('Error:', errorLaia);
    return;
  }

  console.log('✅ Alumna encontrada:');
  console.log(`   Nombre: ${laia.nombre}`);
  console.log(`   ID: ${laia.id}`);
  console.log(`   Grado: ${laia.grado?.nombre || 'N/A'}`);
  console.log(`   Padre ID: ${laia.padre_id}\n`);

  // Buscar inscripción activa
  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from('comedor_inscripciones')
    .select('*')
    .eq('hijo_id', laia.id)
    .eq('activo', true)
    .maybeSingle();

  if (errorInscripcion || !inscripcion) {
    console.error('❌ No se encontró inscripción activa para Laia');
    return;
  }

  console.log('✅ Inscripción activa encontrada:');
  console.log(`   ID: ${inscripcion.id}`);
  console.log(`   Días de semana: ${inscripcion.dias_semana.join(', ')} (${inscripcion.dias_semana.length} días/semana)`);
  console.log(`   Precio diario: ${inscripcion.precio_diario}€`);
  console.log(`   Descuento aplicado: ${inscripcion.descuento_aplicado || 0}%`);
  console.log(`   Fecha inicio: ${inscripcion.fecha_inicio}`);
  console.log(`   Fecha fin: ${inscripcion.fecha_fin || 'Indefinida'}\n`);

  // Verificar bajas en octubre
  const { data: bajas, error: errorBajas } = await supabase
    .from('comedor_bajas')
    .select('*')
    .eq('hijo_id', laia.id)
    .order('fecha_creacion', { ascending: false });

  const bajasOctubre = bajas?.filter(baja => {
    return baja.dias.some(dia => {
      // El formato es DD/MM/YYYY
      const [d, m, y] = dia.split('/');
      return y === '2024' && m === '10';
    });
  }) || [];

  console.log(`📅 Bajas comunicadas en octubre: ${bajasOctubre.length}`);
  if (bajasOctubre.length > 0) {
    bajasOctubre.forEach(baja => {
      console.log(`   - ${baja.dias.filter(dia => dia.includes('/10/2024')).join(', ')}`);
    });
  }
  console.log('');

  // Verificar invitaciones en octubre
  const { data: invitaciones, error: errorInvitaciones } = await supabase
    .from('invitaciones_comedor')
    .select('*')
    .eq('hijo_id', laia.id)
    .gte('fecha', '2024-10-01')
    .lte('fecha', '2024-10-31');

  console.log(`🎁 Invitaciones en octubre: ${invitaciones?.length || 0}`);
  if (invitaciones && invitaciones.length > 0) {
    invitaciones.forEach(inv => {
      console.log(`   - ${inv.fecha} (${inv.tipo})`);
    });
  }
  console.log('');

  // Obtener configuración de precios
  const { data: config, error: errorConfig } = await supabase
    .from('configuracion_precios')
    .select('*')
    .eq('activo', true)
    .maybeSingle();

  if (config) {
    console.log('⚙️ Configuración de precios actual:');
    console.log(`   Umbral de asistencia: ${config.umbral_asistencia_descuento}%`);
    console.log(`   Descuento por asistencia: ${config.descuento_asistencia_80}%`);
    console.log(`   Descuento familia numerosa: ${config.descuento_tercer_hijo}%\n`);
  }

  // Calcular días esperados en octubre
  const diasLaborablesOctubre = [];
  for (let dia = 1; dia <= 31; dia++) {
    const fecha = new Date(2024, 9, dia); // 9 = octubre (0-indexed)
    const diaSemana = fecha.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborablesOctubre.push(fecha);
    }
  }

  let diasEsperados = 0;
  const fechaInicio = new Date(inscripcion.fecha_inicio);

  for (const fecha of diasLaborablesOctubre) {
    const diaSemana = fecha.getDay();
    if (inscripcion.dias_semana.includes(diaSemana) && fecha >= fechaInicio) {
      diasEsperados++;
    }
  }

  console.log('📊 CÁLCULO DE ASISTENCIA:');
  console.log(`   Total días laborables en octubre: ${diasLaborablesOctubre.length}`);
  console.log(`   Días que Laia DEBERÍA asistir: ${diasEsperados}`);

  // Contar días de baja
  let diasConBaja = 0;
  if (bajasOctubre.length > 0) {
    bajasOctubre.forEach(baja => {
      diasConBaja += baja.dias.filter(dia => dia.includes('/10/2024')).length;
    });
  }

  const diasAsistidos = diasEsperados - diasConBaja - (invitaciones?.length || 0);
  const porcentajeAsistencia = diasEsperados > 0 ? (diasAsistidos / diasEsperados) * 100 : 0;

  console.log(`   Días con baja: ${diasConBaja}`);
  console.log(`   Días con invitación: ${invitaciones?.length || 0}`);
  console.log(`   Días que REALMENTE asistió: ${diasAsistidos}`);
  console.log(`   Porcentaje de asistencia: ${porcentajeAsistencia.toFixed(2)}%\n`);

  if (config) {
    const cumpleUmbral = porcentajeAsistencia >= config.umbral_asistencia_descuento;
    console.log(`${cumpleUmbral ? '✅' : '❌'} ${cumpleUmbral ? 'SÍ' : 'NO'} alcanza el umbral del ${config.umbral_asistencia_descuento}%`);
    if (cumpleUmbral) {
      console.log(`   Descuento aplicable: ${config.descuento_asistencia_80}%`);
    }
  }
}

verificarLaiaOctubre().catch(console.error);
