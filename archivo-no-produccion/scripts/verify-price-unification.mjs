import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function verifyPriceUnification() {
  console.log('\n🔍 Verificando la unificación de precios...\n');

  try {
    console.log('1️⃣  Verificando configuración de precios...');
    const { data: configs, error: configError } = await supabase
      .from('configuracion_precios')
      .select('*')
      .eq('activo', true);

    if (configError) {
      console.error('❌ Error al consultar configuracion_precios:', configError.message);
      return;
    }

    console.log(`   ✅ Configuraciones activas encontradas: ${configs.length}`);
    configs.forEach(config => {
      console.log(`      - ${config.nombre}: ${config.dias_min}-${config.dias_max} días = ${config.precio}€`);
    });

    const alumnosConfig = configs.find(c => c.dias_min === 1 && c.dias_max === 5);
    if (alumnosConfig) {
      console.log(`   ✅ Precio único para alumnos (1-5 días): ${alumnosConfig.precio}€`);
    } else {
      console.log('   ⚠️  No se encontró configuración para rango 1-5 días');
    }

    console.log('\n2️⃣  Verificando inscripciones con precio antiguo (7.50€)...');
    const { data: oldPriceInscriptions, error: oldPriceError } = await supabase
      .from('comedor_inscripciones')
      .select('id, precio_diario, activo')
      .eq('precio_diario', 7.50);

    if (oldPriceError) {
      console.error('❌ Error al consultar inscripciones:', oldPriceError.message);
      return;
    }

    if (oldPriceInscriptions.length === 0) {
      console.log('   ✅ No hay inscripciones con precio 7.50€ - Todas actualizadas correctamente');
    } else {
      console.log(`   ⚠️  Encontradas ${oldPriceInscriptions.length} inscripciones con precio 7.50€`);
      console.log('      (Esto puede indicar que la migración no se completó)');
    }

    console.log('\n3️⃣  Verificando distribución de precios en inscripciones activas...');
    const { data: allInscriptions, error: allError } = await supabase
      .from('comedor_inscripciones')
      .select('precio_diario, activo')
      .eq('activo', true);

    if (allError) {
      console.error('❌ Error al consultar inscripciones:', allError.message);
      return;
    }

    const priceDistribution = allInscriptions.reduce((acc, ins) => {
      const price = parseFloat(ins.precio_diario);
      acc[price] = (acc[price] || 0) + 1;
      return acc;
    }, {});

    console.log('   Distribución de precios en inscripciones activas:');
    Object.entries(priceDistribution).forEach(([price, count]) => {
      console.log(`      - ${price}€: ${count} inscripciones`);
    });

    console.log('\n4️⃣  Verificando precios especiales...');
    if (alumnosConfig) {
      console.log(`   ✅ Precio hijo personal: ${alumnosConfig.precio_hijo_personal}€`);
      console.log(`   ✅ Precio adulto: ${alumnosConfig.precio_adulto}€`);
      console.log(`   ✅ Descuento tercer hijo: ${alumnosConfig.descuento_tercer_hijo}%`);
    }

    console.log('\n✨ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

verifyPriceUnification();
