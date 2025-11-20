/*
  # Add overlap constraint for parent inscriptions

  1. Changes
    - Add exclusion constraint that prevents overlapping date ranges for active parent inscriptions
    - This maintains consistency with the student inscriptions table
  
  2. Security
    - No changes to RLS policies
*/

-- Add constraint that allows multiple active inscriptions if date ranges don't overlap
ALTER TABLE comedor_inscripciones_padres
  ADD CONSTRAINT unique_active_inscription_per_padre_dates
  EXCLUDE USING gist (
    padre_id WITH =,
    daterange(fecha_inicio, COALESCE(fecha_fin, '9999-12-31'::date), '[]') WITH &&
  )
  WHERE (activo = true);
