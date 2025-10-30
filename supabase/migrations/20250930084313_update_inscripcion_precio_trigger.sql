/*
  # Update inscription price calculation trigger

  1. Changes
    - Drop existing trigger and function
    - Create new function that calculates price from configuracion_precios table
    - Recreate trigger to use new function

  2. Logic
    - When an inscription is created or updated, automatically calculate precio_diario
    - Look up the price configuration based on number of days selected
    - Use the configured price for the matching range
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_inscripcion_precio ON comedor_inscripciones;
DROP FUNCTION IF EXISTS calculate_inscripcion_precio();

-- Create new function that reads from configuracion_precios
CREATE OR REPLACE FUNCTION calculate_inscripcion_precio()
RETURNS TRIGGER AS $$
DECLARE
  dias_count integer;
  precio_configurado numeric(10, 2);
BEGIN
  -- Count number of days selected
  dias_count := array_length(NEW.dias_semana, 1);
  
  -- Find matching price configuration
  SELECT precio INTO precio_configurado
  FROM configuracion_precios
  WHERE activo = true
    AND dias_count >= dias_min
    AND dias_count <= dias_max
  ORDER BY dias_min
  LIMIT 1;
  
  -- If no configuration found, use default price of 9.15
  IF precio_configurado IS NULL THEN
    precio_configurado := 9.15;
  END IF;
  
  -- Set the calculated price
  NEW.precio_diario := precio_configurado;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_inscripcion_precio
  BEFORE INSERT OR UPDATE ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inscripcion_precio();