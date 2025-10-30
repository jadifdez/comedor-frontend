/*
  # Update trigger to apply family discount

  1. Changes
    - Drop and recreate trigger function to calculate price with family discount
    - When an inscription is created/updated, check total active children
    - If family has 3+ children, apply discount to 3rd child and beyond
    - Keep the 2 most expensive subscriptions at full price

  2. Logic
    - Count all active inscriptions for the same family (based on padre_id from hijos table)
    - Calculate the base price from configuracion_precios
    - If it's the 3rd+ most expensive subscription, apply discount
    - Store both precio_diario (discounted) and descuento_aplicado (percentage)
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_inscripcion_precio ON comedor_inscripciones;
DROP FUNCTION IF EXISTS calculate_inscripcion_precio();

-- Create new function that applies family discount
CREATE OR REPLACE FUNCTION calculate_inscripcion_precio()
RETURNS TRIGGER AS $$
DECLARE
  dias_count integer;
  precio_base numeric(10, 2);
  descuento_porcentaje numeric(5, 2);
  padre_id_hijo uuid;
  total_hijos_activos integer;
  inscripciones_mas_caras integer;
BEGIN
  -- Count number of days selected
  dias_count := array_length(NEW.dias_semana, 1);
  
  -- Find matching base price configuration
  SELECT precio, descuento_tercer_hijo INTO precio_base, descuento_porcentaje
  FROM configuracion_precios
  WHERE activo = true
    AND dias_count >= dias_min
    AND dias_count <= dias_max
  ORDER BY dias_min
  LIMIT 1;
  
  -- If no configuration found, use default values
  IF precio_base IS NULL THEN
    precio_base := 9.15;
    descuento_porcentaje := 0;
  END IF;
  
  -- Get padre_id for this hijo
  SELECT padre_id INTO padre_id_hijo
  FROM hijos
  WHERE id = NEW.hijo_id;
  
  -- Count total active inscriptions for this family (excluding current one)
  SELECT COUNT(*) INTO total_hijos_activos
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true
    AND ci.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Initialize discount to 0
  NEW.descuento_aplicado := 0;
  
  -- If family has 3 or more children (including this one), apply discount logic
  IF total_hijos_activos >= 2 THEN
    -- Count how many inscriptions are more expensive than this one
    SELECT COUNT(*) INTO inscripciones_mas_caras
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true
      AND ci.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        ci.precio_diario > precio_base 
        OR (ci.precio_diario = precio_base AND array_length(ci.dias_semana, 1) > dias_count)
      );
    
    -- If there are already 2 or more more expensive inscriptions, apply discount
    IF inscripciones_mas_caras >= 2 THEN
      NEW.descuento_aplicado := descuento_porcentaje;
      NEW.precio_diario := precio_base * (1 - descuento_porcentaje / 100);
    ELSE
      NEW.precio_diario := precio_base;
    END IF;
  ELSE
    -- Less than 3 children, no discount
    NEW.precio_diario := precio_base;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_inscripcion_precio
  BEFORE INSERT OR UPDATE ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inscripcion_precio();