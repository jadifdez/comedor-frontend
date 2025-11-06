/*
  # Fix padres UPDATE - Nuclear option

  Eliminando TODAS las políticas de UPDATE y creando la más simple posible.
  
  Si esto no funciona, el problema NO es la política RLS.
*/

-- Nuclear: eliminar TODAS las políticas de UPDATE en padres
DROP POLICY IF EXISTS "Admins can update padres" ON padres;
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;
DROP POLICY IF EXISTS "Parents can update own profile" ON padres;
DROP POLICY IF EXISTS "Allow parents to update own data" ON padres;

-- Recrear política de admin
CREATE POLICY "Admins can update padres"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Política SUPER SIMPLE para padres: si tu email está en auth.users, puedes actualizar
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Encuentra la fila por email O por user_id
    (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    (user_id = auth.uid())
  )
  WITH CHECK (
    -- Permite la actualización si el user_id coincide O si es NULL
    -- NO verificamos email en WITH CHECK porque puede cambiar
    (user_id = auth.uid()) OR (user_id IS NULL)
  );
