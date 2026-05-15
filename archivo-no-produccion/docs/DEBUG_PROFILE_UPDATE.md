# Script de Debug para el Error de Actualización de Perfil

## Ejecuta esto en la consola del navegador (F12) cuando estés autenticado

```javascript
// 1. Verificar sesión actual
const { data: { session } } = await supabase.auth.getSession();
console.log('=== SESIÓN ACTUAL ===');
console.log('User ID:', session?.user?.id);
console.log('Email:', session?.user?.email);

// 2. Cargar datos del padre
const { data: padreData, error: loadError } = await supabase
  .from('padres')
  .select('*')
  .eq('email', session?.user?.email)
  .maybeSingle();

console.log('\n=== DATOS DEL PADRE ===');
console.log('ID:', padreData?.id);
console.log('Email:', padreData?.email);
console.log('Nombre:', padreData?.nombre);
console.log('user_id:', padreData?.user_id);
console.log('Load Error:', loadError);

// 3. Intentar actualizar SOLO el nombre (sin cambiar email)
console.log('\n=== TEST 1: Actualizar nombre sin cambiar email ===');
const { data: update1, error: error1 } = await supabase
  .from('padres')
  .update({
    nombre: padreData.nombre + ' (test)',
    email: padreData.email,
    telefono: padreData.telefono
  })
  .eq('id', padreData.id)
  .select();

console.log('Resultado:', update1);
console.log('Error:', error1);

if (!error1) {
  // Revertir el cambio
  await supabase
    .from('padres')
    .update({ nombre: padreData.nombre })
    .eq('id', padreData.id);
  console.log('✓ Test 1 pasó - revirtiendo cambio');
}

// 4. Intentar actualizar el email
console.log('\n=== TEST 2: Actualizar email ===');
const testEmail = `test_${Date.now()}@example.com`;
const { data: update2, error: error2 } = await supabase
  .from('padres')
  .update({
    nombre: padreData.nombre,
    email: testEmail,
    telefono: padreData.telefono
  })
  .eq('id', padreData.id)
  .select();

console.log('Resultado:', update2);
console.log('Error:', error2);

if (error2) {
  console.log('\n❌ ERROR ENCONTRADO:');
  console.log('Code:', error2.code);
  console.log('Message:', error2.message);
  console.log('Details:', error2.details);
  console.log('Hint:', error2.hint);
} else {
  // Revertir
  await supabase
    .from('padres')
    .update({ email: padreData.email })
    .eq('id', padreData.id);
  console.log('✓ Test 2 pasó - revirtiendo cambio');
}

// 5. Verificar políticas RLS activas
console.log('\n=== Ejecuta esto en el SQL Editor de Supabase ===');
console.log(`
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'padres' AND cmd = 'UPDATE';
`);
```

## Instrucciones

1. Abre tu aplicación en el navegador
2. Inicia sesión como un padre
3. Abre la consola del navegador (F12 → Console)
4. Copia y pega el script completo
5. Presiona Enter
6. **Copia TODA la salida** y envíamela

Esto me dirá EXACTAMENTE dónde está fallando.
