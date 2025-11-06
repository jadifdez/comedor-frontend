/*
  # Fix padres UPDATE - Solución final

  El problema era que WITH CHECK verificaba auth.email() pero el email
  puede cambiar durante el update. La solución es verificar SOLO por user_id.
  
  USING: verifica que puedes leer la fila (por email O user_id)
  WITH CHECK: verifica que puedes escribir (SOLO por user_id, que no cambia)
*/

-- Eliminar política actual
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Crear política correcta
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Verificar que puedes leer la fila (usando email actual o user_id)
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    -- Para escribir, SOLO verificar user_id (que no cambia)
    -- NO verificar email porque puede estar cambiando en este mismo update
    user_id = auth.uid()
  );
