import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigarAlba() {
  console.log('=== INVESTIGANDO CASO: ALBA MUÑOZ RODRÍGUEZ ===\n');

  // Buscar a Alba en la tabla de padres
  const { data: alba, error: errorAlba } = await supabase
    .from('padres')
    .select('*')
    .ilike('nombre', '%alba%')
    .ilike('apellido', '%muñoz%');

  if (errorAlba) {
    console.error('Error buscando Alba:', errorAlba);
    return;
  }

  console.log('Resultados búsqueda Alba:', alba);

  if (!alba || alba.length === 0) {
    console.log('No se encontró Alba Muñoz Rodríguez en padres');
    return;
  }

  const padreAlba = alba[0];
  console.log('\n=== DATOS DE ALBA ===');
  console.log('ID:', padreAlba.id);
  console.log('Nombre:', padreAlba.nombre, padreAlba.apellido);
  console.log('Es personal:', padreAlba.es_personal);

  // Buscar inscripciones del padre en noviembre 2024
  const { data: inscripciones, error: errorInscripciones } = await supabase
    .from('comedor_inscripciones_padres')
    .select('*')
    .eq('padre_id', padreAlba.id);

  console.log('\n=== INSCRIPCIONES DE ALBA ===');
  console.log(JSON.stringify(inscripciones, null, 2));

  // Obtener configuración de precios
  const { data: configPrecio, error: errorConfig } = await supabase
    .from('configuracion_precios')
    .select('*')
    .eq('activo', true);

  console.log('\n=== CONFIGURACIÓN DE PRECIOS ===');
  console.log(JSON.stringify(configPrecio, null, 2));

  // Obtener días laborables de noviembre 2024
  const { data: diasFestivos, error: errorFestivos } = await supabase
    .from('dias_festivos')
    .select('fecha')
    .eq('activo', true)
    .gte('fecha', '2024-11-01')
    .lt('fecha', '2024-12-01');

  console.log('\n=== DÍAS FESTIVOS NOVIEMBRE 2024 ===');
  console.log(JSON.stringify(diasFestivos, null, 2));

  // Calcular días laborables
  const festivosSet = new Set(diasFestivos?.map(d => d.fecha) || []);
  const diasLaborables = [];
  
  for (let dia = 1; dia <= 30; dia++) {
    const fecha = new Date(2024, 10, dia); // mes 10 = noviembre
    const diaSemana = fecha.getDay();
    const fechaStr = `2024-11-${String(dia).padStart(2, '0')}`;
    
    if (diaSemana >= 1 && diaSemana <= 5 && !festivosSet.has(fechaStr)) {
      diasLaborables.push(fechaStr);
    }
  }

  console.log('\n=== DÍAS LABORABLES NOVIEMBRE 2024 ===');
  console.log('Total:', diasLaborables.length);
  console.log(diasLaborables);

  // Buscar bajas de Alba en noviembre
  const { data: bajas, error: errorBajas } = await supabase
    .from('comedor_bajas')
    .select('*')
    .eq('padre_id', padreAlba.id);

  console.log('\n=== BAJAS DE ALBA ===');
  console.log(JSON.stringify(bajas, null, 2));

  // Buscar invitaciones de Alba en noviembre
  const { data: invitaciones, error: errorInvitaciones } = await supabase
    .from('invitaciones_comedor')
    .select('*')
    .eq('padre_id', padreAlba.id)
    .gte('fecha', '2024-11-01')
    .lte('fecha', '2024-11-30');

  console.log('\n=== INVITACIONES DE ALBA EN NOVIEMBRE ===');
  console.log(JSON.stringify(invitaciones, null, 2));

  // Calcular manualmente
  if (inscripciones && inscripciones.length > 0) {
    const insc = inscripciones[0];
    console.log('\n=== CÁLCULO MANUAL ===');
    console.log('Precio diario:', insc.precio_diario);
    console.log('Días semana inscritos:', insc.dias_semana);
    
    let diasFacturables = 0;
    const bajasSet = new Set();
    
    if (bajas && bajas.length > 0) {
      bajas.forEach(baja => {
        baja.dias.forEach(dia => bajasSet.add(dia));
      });
    }
    
    const invitacionesSet = new Set(invitaciones?.map(i => i.fecha) || []);
    
    for (const fecha of diasLaborables) {
      const fechaDate = new Date(fecha);
      const diaSemana = fechaDate.getDay();
      
      // Formatear fecha para comparar con bajas
      const fechaFormateada = fechaDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Verificar si es invitación
      if (invitacionesSet.has(fecha)) {
        console.log(`${fecha} (${diaSemana}) - INVITACIÓN`);
        continue;
      }
      
      // Verificar si es baja
      if (bajasSet.has(fechaFormateada)) {
        console.log(`${fecha} (${diaSemana}) - BAJA`);
        continue;
      }
      
      // Verificar si está en días de inscripción
      if (insc.dias_semana.includes(diaSemana)) {
        // Verificar rango de fechas
        const fechaInicio = new Date(insc.fecha_inicio);
        const fechaFin = insc.fecha_fin ? new Date(insc.fecha_fin) : null;
        
        if (fechaDate >= fechaInicio && (!fechaFin || fechaDate <= fechaFin)) {
          diasFacturables++;
          console.log(`${fecha} (${diaSemana}) - FACTURABLE`);
        } else {
          console.log(`${fecha} (${diaSemana}) - FUERA DE RANGO`);
        }
      } else {
        console.log(`${fecha} (${diaSemana}) - NO EN DÍAS INSCRITOS`);
      }
    }
    
    console.log('\n=== RESULTADO ===');
    console.log('Días facturables:', diasFacturables);
    console.log('Precio por día:', insc.precio_diario);
    console.log('Total sin descuento:', diasFacturables * insc.precio_diario);
    
    // Verificar descuento asistencia 80%
    const totalDiasLaborables = diasLaborables.length;
    const umbralDias = Math.ceil(totalDiasLaborables * 0.8);
    console.log('\nDías laborables totales:', totalDiasLaborables);
    console.log('Umbral para descuento 80%:', umbralDias);
    console.log('¿Aplica descuento?:', diasFacturables >= umbralDias);
    
    if (diasFacturables >= umbralDias) {
      const descuento = configPrecio?.[0]?.descuento_asistencia_80 || 18;
      const totalConDescuento = (diasFacturables * insc.precio_diario) * (1 - descuento / 100);
      console.log('Descuento aplicado:', descuento + '%');
      console.log('Total con descuento:', totalConDescuento.toFixed(2) + '€');
    }
  }
}

investigarAlba().catch(console.error);
