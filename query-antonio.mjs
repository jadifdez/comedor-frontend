import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAntonio() {
  console.log('=== BUSCANDO PADRE ANTONIO GAMEZ ===\n');
  
  const { data: padre, error: errorPadre } = await supabase
    .from('padres')
    .select('*')
    .ilike('email', '%antoniogamez%')
    .single();
  
  if (errorPadre) {
    console.log('Error buscando padre:', errorPadre);
    return;
  }
  
  if (!padre) {
    console.log('No se encontro el padre');
    return;
  }
  
  console.log('PADRE:', JSON.stringify(padre, null, 2));
  console.log('\n');
  
  const { data: hijos, error: errorHijos } = await supabase
    .from('hijos')
    .select('*, grado:grados(*)')
    .eq('padre_id', padre.id)
    .eq('activo', true);
  
  console.log(`\n=== HIJOS (${hijos ? hijos.length : 0}) ===`);
  if (hijos) {
    hijos.forEach((hijo, i) => {
      console.log(`\n${i+1}. ${hijo.nombre}`);
      console.log(`   ID: ${hijo.id}`);
      console.log(`   Grado: ${hijo.grado ? hijo.grado.nombre : 'N/A'}`);
      console.log(`   Activo: ${hijo.activo}`);
    });
  }
  
  const idsHijos = hijos ? hijos.map(h => h.id) : [];
  const { data: inscripciones, error: errorInsc } = await supabase
    .from('comedor_inscripciones')
    .select('*')
    .in('hijo_id', idsHijos)
    .eq('activo', true);
  
  console.log(`\n\n=== INSCRIPCIONES ACTIVAS (${inscripciones ? inscripciones.length : 0}) ===`);
  if (inscripciones) {
    inscripciones.forEach((insc, i) => {
      const hijo = hijos ? hijos.find(h => h.id === insc.hijo_id) : null;
      console.log(`\n${i+1}. Hijo: ${hijo ? hijo.nombre : 'N/A'}`);
      console.log(`   Precio diario: ${insc.precio_diario} euros`);
      console.log(`   Dias semana: ${insc.dias_semana.length} dias`);
      console.log(`   Descuento aplicado: ${insc.descuento_aplicado || 0}%`);
      console.log(`   Fecha inicio: ${insc.fecha_inicio}`);
      console.log(`   Fecha fin: ${insc.fecha_fin || 'Sin fin'}`);
      console.log(`   Creado: ${insc.created_at}`);
    });
  }
  
  const mesSeleccionado = '2024-10';
  const [year, month] = mesSeleccionado.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const fechaFinMes = `${year}-${String(month).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;
  
  console.log(`\n\n=== FACTURACION OCTUBRE 2024 (hasta ${fechaFinMes}) ===`);
  
  const diasLaborables = [];
  for (let dia = 1; dia <= ultimoDiaMes; dia++) {
    const fecha = new Date(year, month - 1, dia);
    const diaSemana = fecha.getDay();
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasLaborables.push(fecha.toISOString().split('T')[0]);
    }
  }
  
  console.log(`Dias laborables en octubre: ${diasLaborables.length}`);
  
  let totalFamilia = 0;
  if (hijos && inscripciones) {
    for (const hijo of hijos) {
      const inscripcion = inscripciones.find(i => i.hijo_id === hijo.id);
      if (!inscripcion) continue;
      
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
      
      console.log(`\n${hijo.nombre}:`);
      console.log(`  - Dias facturables: ${diasFacturables}`);
      console.log(`  - Precio diario: ${inscripcion.precio_diario} euros`);
      console.log(`  - Total: ${totalHijo.toFixed(2)} euros`);
    }
  }
  
  console.log(`\n\nTOTAL FAMILIA: ${totalFamilia.toFixed(2)} euros`);
}

queryAntonio().catch(console.error);
