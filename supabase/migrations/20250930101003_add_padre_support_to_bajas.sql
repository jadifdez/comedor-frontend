/*
  # Agregar soporte para bajas de padres personal en comedor_bajas

  1. Changes
    - Hacer nullable el campo `hijo_id` en `comedor_bajas`
    - Agregar campo `padre_id` en `comedor_bajas` para referenciar a padres
    - Agregar constraint para asegurar que al menos uno (hijo_id o padre_id) esté presente
    - Actualizar RLS policies para permitir bajas de padres personal
  
  2. Security
    - Padres pueden crear bajas para ellos mismos si son personal
    - Padres pueden crear bajas para sus hijos
    - Padres pueden ver sus propias bajas y las de sus hijos
*/

-- Hacer hijo_id nullable
DO $$
BEGIN
  -- Drop foreign key constraint first
  ALTER TABLE comedor_bajas DROP CONSTRAINT IF EXISTS comedor_bajas_hijo_id_fkey;
  
  -- Alter the column to be nullable
  ALTER TABLE comedor_bajas ALTER COLUMN hijo_id DROP NOT NULL;
  
  -- Recreate foreign key constraint
  ALTER TABLE comedor_bajas ADD CONSTRAINT comedor_bajas_hijo_id_fkey 
    FOREIGN KEY (hijo_id) REFERENCES hijos(id) ON DELETE CASCADE;
END $$;

-- Agregar padre_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_bajas' AND column_name = 'padre_id'
  ) THEN
    ALTER TABLE comedor_bajas ADD COLUMN padre_id uuid REFERENCES padres(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar constraint para asegurar que al menos uno esté presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comedor_bajas_persona_check'
  ) THEN
    ALTER TABLE comedor_bajas ADD CONSTRAINT comedor_bajas_persona_check 
      CHECK ((hijo_id IS NOT NULL AND padre_id IS NULL) OR (hijo_id IS NULL AND padre_id IS NOT NULL));
  END IF;
END $$;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Padres can manage bajas of their hijos" ON comedor_bajas;
DROP POLICY IF EXISTS "Padres can insert bajas for their hijos" ON comedor_bajas;
DROP POLICY IF EXISTS "Padres can select bajas for their hijos" ON comedor_bajas;
DROP POLICY IF EXISTS "Padres can delete bajas for their hijos" ON comedor_bajas;

-- Create new RLS policies that support both hijo and padre bajas
CREATE POLICY "Padres can select their bajas and their hijos bajas"
  ON comedor_bajas
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    hijo_id IN (
      SELECT h.id FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    ) OR
    padre_id IN (
      SELECT id FROM padres WHERE email = auth.email()
    )
  );

CREATE POLICY "Padres can insert bajas for themselves and their hijos"
  ON comedor_bajas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      hijo_id IN (
        SELECT h.id FROM hijos h
        JOIN padres p ON h.padre_id = p.id
        WHERE p.email = auth.email()
      ) OR
      padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Padres can delete their bajas and their hijos bajas"
  ON comedor_bajas
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    hijo_id IN (
      SELECT h.id FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    ) OR
    padre_id IN (
      SELECT id FROM padres WHERE email = auth.email()
    )
  );