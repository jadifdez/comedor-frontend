/*
  # Fix family discount logic

  1. Changes
    - Update trigger function to correctly apply discount to 3rd+ child
    - New logic: Order children by inscription cost (price * days), then by creation date
    - Apply discount to the 3rd and subsequent children after the 2 most expensive

  2. Logic
    - Count all active inscriptions for the family
    - If 3 or more, identify this inscription's position
    - Calculate cost as precio_diario * days_count for comparison
    - If this inscription is 3rd or lower (after ordering by cost desc), apply discount
*/

-- Drop and recreate trigger function
DROP TRIGGER IF EXISTS set_inscripcion_precio ON comedor_inscripciones;
DROP FUNCTION IF EXISTS calculate_inscripcion_precio();

CREATE OR REPLACE FUNCTION calculate_inscripcion_precio()
RETURNS TRIGGER AS $$
DECLARE
  dias_count integer;
  precio_base numeric(10, 2);
  descuento_porcentaje numeric(5, 2);
  padre_id_hijo uuid;
  total_inscripciones_activas integer;
  posicion_actual integer;
  costo_actual numeric(10, 2);
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
  
  -- Count total active inscriptions for this family (excluding current one being updated)
  SELECT COUNT(*) INTO total_inscripciones_activas
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true
    AND ci.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Initialize discount to 0
  NEW.descuento_aplicado := 0;
  NEW.precio_diario := precio_base;
  
  -- If family has 3 or more inscriptions (including this one), apply discount logic
  IF total_inscripciones_activas >= 2 THEN
    -- Calculate cost for this inscription
    costo_actual := precio_base * dias_count;
    
    -- Find position of this inscription when ordered by cost (desc) then by created_at
    -- Count how many existing inscriptions have higher cost than this one
    SELECT COUNT(*) + 1 INTO posicion_actual
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true
      AND ci.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) > costo_actual
        OR (
          (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) = costo_actual
          AND ci.created_at < COALESCE(NEW.created_at, now())
        )
      );
    
    -- If this is the 3rd or later inscription (position >= 3), apply discount
    IF posicion_actual >= 3 THEN
      NEW.descuento_aplicado := descuento_porcentaje;
      NEW.precio_diario := precio_base * (1 - descuento_porcentaje / 100);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER set_inscripcion_precio
  BEFORE INSERT OR UPDATE ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inscripcion_precio();