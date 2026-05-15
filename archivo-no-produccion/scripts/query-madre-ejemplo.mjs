import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryMadreEjemplo() {
  console.log('=== BUSCANDO "MADRE DE EJEMPLO" EN LA BASE DE DATOS ===\n');
  
  // Buscar en la tabla padres
  const { data: padres, error: errorPadres } = await supabase
    .from('padres')
    .select('*')
    .ilike('nombre', '%madre%ejemplo%');
  
  if (errorPadres) {
    console.log('Error buscando padre:', errorPadres);
    return;
  }
  
  console.log(`Padres encontrados: ${padres?.length || 0}\n`);
  
  if (!padres || padres.length === 0) {
    console.log('No se encontró ningún padre con ese nombre.');
    console.log('\nBuscando alternativas...\n');
    
    // Buscar todos los padres para ver qué hay
    const { data: todosPadres } = await supabase
      .from('padres')
      .select('id, nombre, email, es_personal, activo')
      .eq('activo', true);
    
    console.log('=== TODOS LOS PADRES ACTIVOS ===');
    todosPadres?.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nombre} (${p.email})${p.es_personal ? ' [PERSONAL]' : ''}`);
    });
    
    return;
  }
  
  // Procesar cada padre encontrado
  for (const padre of padres) {
    console.log('=== INFORMACIÓN DEL PADRE ===');
    console.log(JSON.stringify(padre, null, 2));
    console.log('\n');
    
    // Obtener hijos
    const { data: hijos, error: errorHijos } = await supabase
      .from('hijos')
      .select('*, grado:grados(*)')
      .eq('padre_id', padre.id)
      .eq('activo', true);
    
    console.log(`=== HIJOS (${hijos?.length || 0}) ===`);
    if (hijos) {
      hijos.forEach((hijo, i) => {
        console.log(`\n${i + 1}. ${hijo.nombre}`);
        console.log(`   ID: ${hijo.id}`);
        console.log(`   Grado: ${hijo.grado ? hijo.grado.nombre : 'N/A'}`);
      });
    }
    
    // Obtener inscripciones al comedor
    const idsHijos = hijos ? hijos.map(h => h.id) : [];
    const { data: inscripciones, error: errorInsc } = await supabase
      .from('comedor_inscripciones')
      .select('*')
      .in('hijo_id', idsHijos)
      .eq('activo', true);
    
    console.log(`\n\n=== INSCRIPCIONES ACTIVAS (${inscripciones?.length || 0}) ===`);
    if (inscripciones) {
      inscripciones.forEach((insc, i) => {
        const hijo = hijos?.find(h => h.id === insc.hijo_id);
        console.log(`\n${i + 1}. Hijo: ${hijo ? hijo.nombre : 'N/A'}`);
        console.log(`   Días de la semana: ${insc.dias_semana.join(', ')} (${insc.dias_semana.length} días)`);
        console.log(`   Precio diario: ${insc.precio_diario}€`);
        console.log(`   Descuento aplicado: ${insc.descuento_aplicado || 0}%`);
        console.log(`   Fecha inicio: ${insc.fecha_inicio}`);
        console.log(`   Fecha fin: ${insc.fecha_fin || 'Sin fin'}`);
      });
    }
    
    // Obtener inscripción del padre si es personal
    if (padre.es_personal) {
      const { data: inscPadre } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padre.id)
        .eq('activo', true);
      
      if (inscPadre && inscPadre.length > 0) {
        console.log(`\n\n=== INSCRIPCIÓN DEL PADRE/MADRE ===`);
        inscPadre.forEach((insc) => {
          console.log(`   Días de la semana: ${insc.dias_semana.join(', ')} (${insc.dias_semana.length} días)`);
          console.log(`   Precio diario: ${insc.precio_diario}€`);
          console.log(`   Fecha inicio: ${insc.fecha_inicio}`);
          console.log(`   Fecha fin: ${insc.fecha_fin || 'Sin fin'}`);
        });
      }
    }
    
    // Obtener bajas
    const { data: bajas } = await supabase
      .from('comedor_bajas')
      .select('*')
      .or(`hijo_id.in.(${idsHijos.join(',')}),padre_id.eq.${padre.id}`)
      .order('fecha_creacion', { ascending: false });
    
    if (bajas && bajas.length > 0) {
      console.log(`\n\n=== BAJAS REGISTRADAS (${bajas.length}) ===`);
      bajas.forEach((baja, i) => {
        const hijo = hijos?.find(h => h.id === baja.hijo_id);
        console.log(`\n${i + 1}. ${hijo ? hijo.nombre : padre.nombre}`);
        console.log(`   Días: ${baja.dias.join(', ')}`);
        console.log(`   Motivo: ${baja.motivo || 'No especificado'}`);
      });
    }
    
    // Obtener solicitudes puntuales
    const { data: solicitudes } = await supabase
      .from('comedor_altaspuntuales')
      .select('*')
      .or(`hijo_id.in.(${idsHijos.join(',')}),padre_id.eq.${padre.id}`)
      .order('fecha_creacion', { ascending: false });
    
    if (solicitudes && solicitudes.length > 0) {
      console.log(`\n\n=== SOLICITUDES PUNTUALES (${solicitudes.length}) ===`);
      solicitudes.forEach((sol, i) => {
        const hijo = hijos?.find(h => h.id === sol.hijo_id);
        console.log(`\n${i + 1}. ${hijo ? hijo.nombre : padre.nombre}`);
        console.log(`   Fecha: ${sol.fecha}`);
        console.log(`   Estado: ${sol.estado}`);
        console.log(`   Motivo: ${sol.motivo || 'No especificado'}`);
      });
    }
    
    // Calcular facturación para octubre 2024
    const mesSeleccionado = '2024-10';
    const [year, month] = mesSeleccionado.split('-').map(Number);
    const ultimoDiaMes = new Date(year, month, 0).getDate();
    
    console.log(`\n\n=== CÁLCULO DE FACTURACIÓN - OCTUBRE 2024 ===`);
    
    // Obtener días laborables
    const diasLaborables = [];
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
      const fecha = new Date(year, month - 1, dia);
      const diaSemana = fecha.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasLaborables.push(fecha.toISOString().split('T')[0]);
      }
    }
    
    console.log(`Total días laborables en octubre: ${diasLaborables.length}\n`);
    
    let totalFamilia = 0;
    
    // Calcular por cada hijo
    if (hijos && inscripciones) {
      for (const hijo of hijos) {
        const inscripcion = inscripciones.find(i => i.hijo_id === hijo.id);
        if (!inscripcion) {
          console.log(`${hijo.nombre}: Sin inscripción activa`);
          continue;
        }
        
        let diasFacturables = 0;
        for (const fecha of diasLaborables) {
          const fechaDate = new Date(fecha);
          const diaSemana = fechaDate.getDay();
          const fechaInicio = new Date(inscripcion.fecha_inicio);
          const fechaFin = inscripcion.fecha_fin ? new Date(inscripcion.fecha_fin) : null;
          
          if (inscripcion.dias_semana.includes(diaSemana) && 
              fechaDate >= fechaInicio && 
              (!fechaFin || fechaDate <= fechaFin)) {
            diasFacturables++;
          }
        }
        
        const totalHijo = diasFacturables * inscripcion.precio_diario;
        totalFamilia += totalHijo;
        
        console.log(`${hijo.nombre}:`);
        console.log(`  - Días inscritos: ${inscripcion.dias_semana.length} días/semana`);
        console.log(`  - Días facturables en octubre: ${diasFacturables}`);
        console.log(`  - Precio diario: ${inscripcion.precio_diario}€`);
        console.log(`  - Descuento: ${inscripcion.descuento_aplicado || 0}%`);
        console.log(`  - Total: ${totalHijo.toFixed(2)}€\n`);
      }
    }
    
    console.log(`\n======================================`);
    console.log(`TOTAL FAMILIA: ${totalFamilia.toFixed(2)}€`);
    console.log(`======================================\n`);
  }
}

queryMadreEjemplo().catch(console.error);
