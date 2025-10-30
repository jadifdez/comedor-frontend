/*
  # Simplify enfermedades table

  1. Changes
    - Remove tipo_enfermedad column (not needed)
    - Remove descripcion column (not needed)
    - Remove fecha_inicio and fecha_fin columns (not needed)
    - Remove requiere_dieta_blanda column (not needed, this is always for soft diet)
    - Keep dias_dieta_blanda as the main field for selected days
*/

-- Remove unnecessary columns
ALTER TABLE enfermedades DROP COLUMN IF EXISTS tipo_enfermedad;
ALTER TABLE enfermedades DROP COLUMN IF EXISTS descripcion;
ALTER TABLE enfermedades DROP COLUMN IF EXISTS fecha_inicio;
ALTER TABLE enfermedades DROP COLUMN IF EXISTS fecha_fin;
ALTER TABLE enfermedades DROP COLUMN IF EXISTS requiere_dieta_blanda;