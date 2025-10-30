/*
  # Add precio_hijo_personal to configuracion_precios

  1. Changes
    - Add column `precio_hijo_personal` to `configuracion_precios` table
      - Type: numeric
      - Default: 4.00 (4 euros)
      - Not null
      - Check constraint: must be greater than 0
    - This price will be used for children of personal del colegio (padres con es_personal=true)
    - Children of personal always pay this fixed price regardless of number of days

  2. Notes
    - This is a flat rate for children of school personnel
    - Administrators can modify this price later through the configuration interface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'configuracion_precios'
    AND column_name = 'precio_hijo_personal'
  ) THEN
    ALTER TABLE configuracion_precios 
    ADD COLUMN precio_hijo_personal numeric NOT NULL DEFAULT 4.00
    CHECK (precio_hijo_personal > 0);
  END IF;
END $$;