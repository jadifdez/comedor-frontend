/*
  # Add dias_antelacion to configuracion_precios table

  1. Changes
    - Add `dias_antelacion` column to `configuracion_precios` table
      - Represents minimum days in advance required to cancel/modify operations
      - Default value: 2 days
      - Minimum value: 0 (same day)
      - Maximum value: 7 (one week)

  2. Notes
    - This configuration allows administrators to set how many days in advance
      parents must communicate changes (bajas, solicitudes) to the comedor service
    - All existing rows will have a default value of 2 days
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_precios' AND column_name = 'dias_antelacion'
  ) THEN
    ALTER TABLE configuracion_precios 
    ADD COLUMN dias_antelacion integer DEFAULT 2 CHECK (dias_antelacion >= 0 AND dias_antelacion <= 7);
  END IF;
END $$;
