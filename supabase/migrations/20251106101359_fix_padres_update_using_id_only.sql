/*
  # Fix padres UPDATE - Absolutamente la más simple

  Sin subqueries, sin OR complejos, solo lo básico.
  
  Si el padre tiene user_id, se valida por user_id.
  Si no tiene user_id (registros viejos), se permite el update.
*/

-- Eliminar política actual
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Crear política ULTRA SIMPLE
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Verificar que somos dueños de la fila
    user_id = auth.uid() OR email = auth.email()
  )
  WITH CHECK (
    -- Permitir si user_id coincide, o si user_id es NULL (registros viejos)
    user_id = auth.uid() OR user_id IS NULL
  );
