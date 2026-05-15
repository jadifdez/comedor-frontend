import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function consultarCancelaciones() {
  console.log('🔍 Consultando registros en comedor_cancelaciones_ultimo_momento...\n');

  const { data, error } = await supabase
    .from('comedor_cancelaciones_ultimo_momento')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total de registros encontrados: ${data.length}\n`);

  if (data.length > 0) {
    console.log('Registros:');
    data.forEach((registro, idx) => {
      console.log(`\n${idx + 1}. ID: ${registro.id}`);
      console.log(`   Fecha: ${registro.fecha}`);
      console.log(`   Hijo ID: ${registro.hijo_id || 'null'}`);
      console.log(`   Padre ID: ${registro.padre_id || 'null'}`);
      console.log(`   Motivo: ${registro.motivo || 'null'}`);
      console.log(`   Cancelado por: ${registro.cancelado_por || 'null'}`);
      console.log(`   Created at: ${registro.created_at}`);
    });
  }
}

consultarCancelaciones();
