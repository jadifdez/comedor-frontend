/*
  # Fix padres UPDATE - Remover subconsulta a auth.users

  El problema era que la política usaba una subconsulta a auth.users:
  SELECT users.email FROM auth.users WHERE users.id = auth.uid()
  
  Esto falla porque los usuarios normales no tienen permiso para leer auth.users.
  La solución es usar la función auth.email() que hace exactamente lo mismo pero
  está autorizada para usuarios normales.
*/

-- Eliminar política actual
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Crear política correcta usando auth.email() en lugar de subconsulta
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Verificar que puedes leer la fila (usando email actual o user_id)
    (email = auth.email())
    OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    -- Para escribir, SOLO verificar user_id (que no cambia)
    user_id = auth.uid()
  );
