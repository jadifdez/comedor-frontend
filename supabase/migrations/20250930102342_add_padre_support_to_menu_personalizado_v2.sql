/*
  # Agregar soporte para elección de menú de padres personal

  1. Changes
    - Hacer nullable el campo `hijo_id` en `comedor_menupersonalizado`
    - Agregar campo `padre_id` para referenciar a padres
    - Agregar constraint para asegurar que al menos uno (hijo_id o padre_id) esté presente
    - Crear índices únicos parciales para hijo_id y padre_id
    - Actualizar RLS policies para permitir elecciones de padres personal
  
  2. Security
    - Padres pueden crear elecciones para ellos mismos si son personal
    - Padres pueden crear elecciones para sus hijos
    - Padres pueden ver sus propias elecciones y las de sus hijos
*/

-- Primero, eliminar el constraint UNIQUE existente
ALTER TABLE comedor_menupersonalizado DROP CONSTRAINT IF EXISTS elecciones_menu_hijo_id_fecha_key;

-- Hacer hijo_id nullable
DO $$
BEGIN
  ALTER TABLE comedor_menupersonalizado ALTER COLUMN hijo_id DROP NOT NULL;
END $$;

-- Agregar padre_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_menupersonalizado' AND column_name = 'padre_id'
  ) THEN
    ALTER TABLE comedor_menupersonalizado ADD COLUMN padre_id uuid REFERENCES padres(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Agregar constraint para asegurar que al menos uno esté presente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comedor_menupersonalizado_persona_check'
  ) THEN
    ALTER TABLE comedor_menupersonalizado ADD CONSTRAINT comedor_menupersonalizado_persona_check 
      CHECK ((hijo_id IS NOT NULL AND padre_id IS NULL) OR (hijo_id IS NULL AND padre_id IS NOT NULL));
  END IF;
END $$;

-- Crear índices únicos parciales para hijo_id y padre_id
DROP INDEX IF EXISTS comedor_menupersonalizado_hijo_fecha_unique;
DROP INDEX IF EXISTS comedor_menupersonalizado_padre_fecha_unique;

CREATE UNIQUE INDEX comedor_menupersonalizado_hijo_fecha_unique 
  ON comedor_menupersonalizado (hijo_id, fecha) 
  WHERE hijo_id IS NOT NULL;

CREATE UNIQUE INDEX comedor_menupersonalizado_padre_fecha_unique 
  ON comedor_menupersonalizado (padre_id, fecha) 
  WHERE padre_id IS NOT NULL;

-- Drop existing RLS policy
DROP POLICY IF EXISTS "Parents can manage menu selections for their children" ON comedor_menupersonalizado;

-- Create new RLS policies that support both hijo and padre selections
CREATE POLICY "Padres can select their menu selections and their hijos menu selections"
  ON comedor_menupersonalizado
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

CREATE POLICY "Padres can insert menu selections for themselves and their hijos"
  ON comedor_menupersonalizado
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

CREATE POLICY "Padres can update their menu selections and their hijos menu selections"
  ON comedor_menupersonalizado
  FOR UPDATE
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
  )
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

CREATE POLICY "Padres can delete their menu selections and their hijos menu selections"
  ON comedor_menupersonalizado
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