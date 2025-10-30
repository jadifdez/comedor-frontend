/*
  # Ensure foreign key relationship between hijos and grados

  1. Changes
    - Add grado_id column to hijos table if it doesn't exist
    - Create foreign key constraint between hijos.grado_id and grados.id
    - Update existing records to match curso text with grado names
    - Remove old curso column if it exists

  2. Security
    - Maintains existing RLS policies
*/

-- First, ensure the grados table exists with the correct data
INSERT INTO grados (nombre, orden, activo) VALUES
  ('1º de Primaria', 1, true),
  ('2º de Primaria', 2, true),
  ('1º de ESO', 3, true)
ON CONFLICT (nombre) DO NOTHING;

-- Add grado_id column to hijos table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hijos' AND column_name = 'grado_id'
  ) THEN
    ALTER TABLE hijos ADD COLUMN grado_id uuid;
  END IF;
END $$;

-- Update existing records to match curso with grado_id
UPDATE hijos 
SET grado_id = (
  SELECT g.id 
  FROM grados g 
  WHERE g.nombre = hijos.curso
)
WHERE grado_id IS NULL AND curso IS NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'hijos_grado_id_fkey'
    AND table_name = 'hijos'
  ) THEN
    ALTER TABLE hijos 
    ADD CONSTRAINT hijos_grado_id_fkey 
    FOREIGN KEY (grado_id) REFERENCES grados(id);
  END IF;
END $$;

-- Remove the old curso column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hijos' AND column_name = 'curso'
  ) THEN
    ALTER TABLE hijos DROP COLUMN curso;
  END IF;
END $$;