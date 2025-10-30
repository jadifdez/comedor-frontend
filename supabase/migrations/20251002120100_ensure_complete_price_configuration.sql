/*
  # Ensure complete price configuration

  1. Purpose
    - Verify that all price configuration records have all required fields
    - Set any missing fields to their default values
    - Ensure at least one active configuration exists

  2. Updates
    - Update existing configurations to have all fields populated
    - Verify precio_adulto is set (default 9.15)
    - Verify precio_hijo_personal is set (default 4.00)
    - Verify descuento_tercer_hijo is set (default 0)
*/

-- Update existing configurations to ensure all fields are populated
UPDATE configuracion_precios
SET
  precio_adulto = COALESCE(precio_adulto, 9.15),
  precio_hijo_personal = COALESCE(precio_hijo_personal, 4.00),
  descuento_tercer_hijo = COALESCE(descuento_tercer_hijo, 0)
WHERE activo = true;

-- Verify at least one active configuration exists
DO $$
DECLARE
  config_count integer;
BEGIN
  SELECT COUNT(*) INTO config_count
  FROM configuracion_precios
  WHERE activo = true;

  IF config_count = 0 THEN
    RAISE EXCEPTION 'No active price configuration found. Please create at least one active price configuration.';
  END IF;
END $$;
