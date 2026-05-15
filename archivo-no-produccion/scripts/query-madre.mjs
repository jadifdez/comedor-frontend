import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryMadreEjemplo() {
  console.log('=== BUSCANDO "MADRE DE EJEMPLO" ===\n');
  
  const { data: padres, error: errorPadres } = await supabase
    .from('padres')
    .select('*')
    .ilike('nombre', '%madre%ejemplo%');
  
  if (errorPadres) {
    console.log('Error:', errorPadres);
    return;
  }
  
  const numPadres = padres ? padres.length : 0;
  console.log('Padres encontrados:', numPadres, '\n');
  
  if (numPadres === 0) {
    console.log('No se encontró. Mostrando todos los padres activos:\n');
    
    const { data: todosPadres } = await supabase
      .from('padres')
      .select('id, nombre, email, es_personal')
      .eq('activo', true)
      .order('nombre');
    
    if (todosPadres) {
      todosPadres.forEach((p, i) => {
        const personal = p.es_personal ? ' [PERSONAL]' : '';
        console.log((i + 1) + '. ' + p.nombre + ' (' + p.email + ')' + personal);
      });
    }
    return;
  }
  
  for (const padre of padres) {
    console.log('=== PADRE/MADRE ===');
    console.log('Nombre:', padre.nombre);
    console.log('Email:', padre.email);
    console.log('Teléfono:', padre.telefono || 'No especificado');
    console.log('Es personal:', padre.es_personal ? 'SÍ' : 'NO');
    console.log('');
    
    const { data: hijos } = await supabase
      .from('hijos')
      .select('*, grado:grados(*)')
      .eq('padre_id', padre.id)
      .eq('activo', true);
    
    const numHijos = hijos ? hijos.length : 0;
    console.log('=== HIJOS (' + numHijos + ') ===');
    
    if (hijos) {
      for (let i = 0; i < hijos.length; i++) {
        const hijo = hijos[i];
        console.log((i + 1) + '. ' + hijo.nombre);
        console.log('   Grado: ' + (hijo.grado ? hijo.grado.nombre : 'N/A'));
      }
    }
    console.log('');
    
    const idsHijos = hijos ? hijos.map(h => h.id) : [];
    
    if (idsHijos.length > 0) {
      const { data: inscripciones } = await supabase
        .from('comedor_inscripciones')
        .select('*')
        .in('hijo_id', idsHijos)
        .eq('activo', true);
      
      const numInsc = inscripciones ? inscripciones.length : 0;
      console.log('=== INSCRIPCIONES AL COMEDOR (' + numInsc + ') ===');
      
      if (inscripciones && inscripciones.length > 0) {
        for (let i = 0; i < inscripciones.length; i++) {
          const insc = inscripciones[i];
          const hijo = hijos.find(h => h.id === insc.hijo_id);
          console.log((i + 1) + '. ' + (hijo ? hijo.nombre : 'N/A'));
          console.log('   Días: ' + insc.dias_semana.join(',') + ' (' + insc.dias_semana.length + ' días/semana)');
          console.log('   Precio diario: ' + insc.precio_diario + '€');
          console.log('   Descuento: ' + (insc.descuento_aplicado || 0) + '%');
          console.log('   Desde: ' + insc.fecha_inicio);
          console.log('   Hasta: ' + (insc.fecha_fin || 'Indefinido'));
        }
      }
      console.log('');
    }
    
    if (padre.es_personal) {
      const { data: inscPadre } = await supabase
        .from('comedor_inscripciones_padres')
        .select('*')
        .eq('padre_id', padre.id)
        .eq('activo', true);
      
      if (inscPadre && inscPadre.length > 0) {
        console.log('=== INSCRIPCIÓN DEL PADRE/MADRE (PERSONAL) ===');
        for (let i = 0; i < inscPadre.length; i++) {
          const insc = inscPadre[i];
          console.log('Días: ' + insc.dias_semana.join(',') + ' (' + insc.dias_semana.length + ' días/semana)');
          console.log('Precio diario: ' + insc.precio_diario + '€');
          console.log('Desde: ' + insc.fecha_inicio);
          console.log('Hasta: ' + (insc.fecha_fin || 'Indefinido'));
        }
        console.log('');
      }
    }
    
    console.log('\n=== RESUMEN FACTURACIÓN OCTUBRE 2024 ===\n');
    
    const year = 2024;
    const month = 10;
    const ultimoDia = new Date(year, month, 0).getDate();
    
    const diasLaborables = [];
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(year, month - 1, dia);
      const diaSemana = fecha.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        const fechaStr = year + '-' + String(month).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
        diasLaborables.push(fechaStr);
      }
    }
    
    console.log('Días laborables en octubre: ' + diasLaborables.length + '\n');
    
    let totalFamilia = 0;
    
    if (hijos && idsHijos.length > 0) {
      const { data: inscripciones } = await supabase
        .from('comedor_inscripciones')
        .select('*')
        .in('hijo_id', idsHijos)
        .eq('activo', true);
      
      if (inscripciones) {
        for (const hijo of hijos) {
          const inscripcion = inscripciones.find(i => i.hijo_id === hijo.id);
          if (!inscripcion) {
            console.log(hijo.nombre + ': Sin inscripción');
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
                (fechaFin === null || fechaDate <= fechaFin)) {
              diasFacturables++;
            }
          }
          
          const totalHijo = diasFacturables * inscripcion.precio_diario;
          totalFamilia += totalHijo;
          
          console.log(hijo.nombre + ':');
          console.log('  Días facturables: ' + diasFacturables);
          console.log('  Precio diario: ' + inscripcion.precio_diario + '€');
          console.log('  Descuento: ' + (inscripcion.descuento_aplicado || 0) + '%');
          console.log('  TOTAL: ' + totalHijo.toFixed(2) + '€\n');
        }
      }
    }
    
    console.log('=====================================');
    console.log('TOTAL FAMILIA: ' + totalFamilia.toFixed(2) + '€');
    console.log('=====================================\n');
  }
}

queryMadreEjemplo().catch(console.error);
