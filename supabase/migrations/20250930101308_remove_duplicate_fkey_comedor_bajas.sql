/*
  # Eliminar foreign key duplicada en comedor_bajas

  1. Changes
    - Eliminar la foreign key antigua `bajas_comedor_hijo_id_fkey`
    - Mantener solo `comedor_bajas_hijo_id_fkey`

  2. Notes
    - Esto resuelve el conflicto de ambigüedad en las consultas con JOIN
*/

-- Eliminar la foreign key antigua
ALTER TABLE comedor_bajas DROP CONSTRAINT IF EXISTS bajas_comedor_hijo_id_fkey;