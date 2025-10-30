/*
  # Agregar soporte para solicitudes puntuales de padres personal

  1. Changes
    - Hacer nullable el campo `hijo_id` en `comedor_altaspuntuales`
    - Agregar campo `padre_id` en `comedor_altaspuntuales` para referenciar a padres
    - Agregar constraint para asegurar que al menos uno (hijo_id o padre_id) esté presente
    - Actualizar RLS policies para permitir solicitudes de padres personal
  
  2. Security
    - Padres pueden crear solicitudes para ellos mismos si son personal
    - Padres pueden crear solicitudes para sus hijos
    - Padres pueden ver sus propias solicitudes y las de sus hijos
*/

-- Hacer hijo_id nullable
DO $$
BEGIN
  -- Drop foreign key constraint first
  ALTER TABLE comedor_altaspuntuales DROP CONSTRAINT IF EXISTS solicitudes_comida_hijo_id_fkey;
  ALTER TABLE comedor_altaspuntuales DROP CONSTRAINT IF EXISTS comedor_altaspuntuales_hijo_id_fkey;
  
  -- Alter the column to be nullable
  ALTER TABLE comedor_altaspuntuales ALTER COLUMN hijo_id DROP NOT NULL;
  
  -- Recreate foreign key constraint
  ALTER TABLE comedor_altaspuntuales ADD CONSTRAINT comedor_altaspuntuales_hijo_id_fkey 
    FOREIGN KEY (hijo_id) REFERENCES hijos(id) ON DELETE CASCADE;
END $$;

-- Agregar padre_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_altaspuntuales' AND column_name = 'padre_id'
  ) THEN
    ALTER TABLE comedor_altaspuntuales ADD COLUMN padre_id uuid REFERENCES padres(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar constraint para asegurar que al menos uno esté presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comedor_altaspuntuales_persona_check'
  ) THEN
    ALTER TABLE comedor_altaspuntuales ADD CONSTRAINT comedor_altaspuntuales_persona_check 
      CHECK ((hijo_id IS NOT NULL AND padre_id IS NULL) OR (hijo_id IS NULL AND padre_id IS NOT NULL));
  END IF;
END $$;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Padres can manage solicitudes of their hijos" ON comedor_altaspuntuales;
DROP POLICY IF EXISTS "Padres can insert solicitudes for their hijos" ON comedor_altaspuntuales;
DROP POLICY IF EXISTS "Padres can select solicitudes for their hijos" ON comedor_altaspuntuales;
DROP POLICY IF EXISTS "Padres can delete solicitudes for their hijos" ON comedor_altaspuntuales;

-- Create new RLS policies that support both hijo and padre solicitudes
CREATE POLICY "Padres can select their solicitudes and their hijos solicitudes"
  ON comedor_altaspuntuales
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

CREATE POLICY "Padres can insert solicitudes for themselves and their hijos"
  ON comedor_altaspuntuales
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

CREATE POLICY "Padres can delete their solicitudes and their hijos solicitudes"
  ON comedor_altaspuntuales
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