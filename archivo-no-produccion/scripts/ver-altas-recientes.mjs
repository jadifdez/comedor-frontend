import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verAltasRecientes() {
  console.log('=== TODAS LAS ALTAS PUNTUALES ===\n');

  const { data: altas, error } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .order('fecha_creacion', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total de altas encontradas: ${altas?.length || 0}\n`);

  if (altas && altas.length > 0) {
    altas.forEach((a, index) => {
      console.log(`\n${index + 1}. Alta ID: ${a.id}`);
      console.log(`   Hijo: ${a.hijo}`);
      console.log(`   Hijo ID: ${a.hijo_id}`);
      console.log(`   Fecha: ${a.fecha}`);
      console.log(`   Estado: ${a.estado}`);
      console.log(`   Curso: ${a.curso}`);
      console.log(`   Creado: ${a.fecha_creacion}`);
    });
  }

  // También buscar altas para el 9 de diciembre específicamente
  console.log('\n\n=== ALTAS PARA 09/12/2025 ===\n');

  const { data: altasDic9, error: errorDic9 } = await supabase
    .from('comedor_altaspuntuales')
    .select('*')
    .eq('fecha', '09/12/2025');

  if (errorDic9) {
    console.error('Error:', errorDic9);
  } else {
    console.log(`Total: ${altasDic9?.length || 0}`);
    if (altasDic9 && altasDic9.length > 0) {
      altasDic9.forEach(a => {
        console.log(`\n  Hijo: ${a.hijo}`);
        console.log(`  Estado: ${a.estado}`);
      });
    }
  }
}

verAltasRecientes().catch(console.error);
