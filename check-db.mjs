import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://0ec90b57d6e95fcbda19832f.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw'
);

console.log('=== INVITACIONES ===');
const { data: inv, error: invError } = await supabase.from('invitaciones_comedor').select('*');
if (invError) {
  console.log('Error:', invError);
} else {
  console.log('Total invitaciones:', inv ? inv.length : 0);
  if (inv && inv.length > 0) {
    inv.forEach(i => {
      console.log('\n  Fecha:', i.fecha);
      console.log('  hijo_id:', i.hijo_id || 'NULL');
      console.log('  padre_id:', i.padre_id || 'NULL');
      console.log('  motivo:', i.motivo);
    });
    
    if (inv[0].hijo_id) {
      console.log('\n=== HIJO INVITADO ===');
      const { data: hijo } = await supabase.from('hijos').select('*, padre:padres(*)').eq('id', inv[0].hijo_id).maybeSingle();
      if (hijo) {
        console.log('Hijo:', hijo.nombre);
        console.log('Padre:', hijo.padre ? hijo.padre.nombre : 'NULL');
        console.log('Padre ID:', hijo.padre ? hijo.padre.id : 'NULL');
        
        if (hijo.padre) {
          console.log('\n=== TODOS LOS HIJOS DE', hijo.padre.nombre, '===');
          const { data: hermanos } = await supabase.from('hijos').select('id, nombre').eq('padre_id', hijo.padre.id).eq('activo', true);
          if (hermanos) {
            hermanos.forEach(h => console.log('  ', h.nombre, '-', h.id));
            
            console.log('\n=== INSCRIPCIONES ===');
            const { data: insc } = await supabase.from('comedor_inscripciones').select('*').in('hijo_id', hermanos.map(h => h.id)).eq('activo', true);
            if (insc) {
              insc.forEach(i => {
                const h = hermanos.find(x => x.id === i.hijo_id);
                console.log('  ', h ? h.nombre : 'NULL', '- dias:', i.dias_semana.length, '- precio:', i.precio_diario, '- desc:', (i.descuento_aplicado || 0) + '%');
              });
            }
          }
        }
      }
    }
  }
}
