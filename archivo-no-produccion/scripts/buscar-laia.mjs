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

async function buscarLaia() {
  console.log('Buscando alumnas con nombre similar a "Laia"...\n');

  const { data: alumnas, error } = await supabase
    .from('hijos')
    .select('*, grado:grados(*)')
    .ilike('nombre', '%laia%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!alumnas || alumnas.length === 0) {
    console.log('No se encontraron alumnas con ese nombre');
    return;
  }

  console.log(`Encontradas ${alumnas.length} alumna(s):\n`);
  alumnas.forEach((alumna, index) => {
    console.log(`${index + 1}. ${alumna.nombre}`);
    console.log(`   ID: ${alumna.id}`);
    console.log(`   Grado: ${alumna.grado?.nombre || 'N/A'}`);
    console.log(`   Activo: ${alumna.activo ? 'Sí' : 'No'}\n`);
  });
}

buscarLaia().catch(console.error);
