/*
  # Fix inscription overlap constraint

  1. Changes
    - Enable btree_gist extension for UUID support in exclusion constraints
    - Drop the old exclusion constraint that prevents multiple active inscriptions
    - Add new exclusion constraint that prevents overlapping date ranges for active inscriptions
    - This allows multiple active inscriptions for the same student if they don't overlap in time
  
  2. Security
    - No changes to RLS policies
*/

-- Enable btree_gist extension for UUID support
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop the old constraint that prevents any duplicate active inscriptions
ALTER TABLE comedor_inscripciones 
  DROP CONSTRAINT IF EXISTS unique_active_inscription_per_hijo;

-- Add new constraint that allows multiple active inscriptions if date ranges don't overlap
-- This uses the daterange type and && operator to check for overlaps
ALTER TABLE comedor_inscripciones
  ADD CONSTRAINT unique_active_inscription_per_hijo_dates
  EXCLUDE USING gist (
    hijo_id WITH =,
    daterange(fecha_inicio, COALESCE(fecha_fin, '9999-12-31'::date), '[]') WITH &&
  )
  WHERE (activo = true);
