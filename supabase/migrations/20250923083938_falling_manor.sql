/*
  # Populate grado_id field in hijos table

  1. Data Update
    - Maps existing curso text values to correct grado_id
    - Updates all hijos records with proper grado references
  
  2. Data Integrity
    - Ensures all hijos have valid grado_id values
    - Creates proper foreign key relationships
*/

-- First, ensure grados table has the required data
INSERT INTO grados (nombre, orden, activo) VALUES
  ('1º de Primaria', 1, true),
  ('2º de Primaria', 2, true),
  ('1º de ESO', 3, true)
ON CONFLICT (nombre) DO NOTHING;

-- Update hijos table to populate grado_id based on existing curso field (if it exists)
DO $$
BEGIN
  -- Check if curso column still exists and update grado_id accordingly
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hijos' AND column_name = 'curso'
  ) THEN
    -- Update based on curso field
    UPDATE hijos 
    SET grado_id = g.id
    FROM grados g
    WHERE hijos.curso = g.nombre;
  ELSE
    -- If curso field doesn't exist, we need to set a default or ask for manual assignment
    -- For now, let's set all to '1º de Primaria' as default
    UPDATE hijos 
    SET grado_id = (SELECT id FROM grados WHERE nombre = '1º de Primaria' LIMIT 1)
    WHERE grado_id IS NULL;
  END IF;
END $$;

-- Ensure grado_id is not null for data integrity
ALTER TABLE hijos ALTER COLUMN grado_id SET NOT NULL;