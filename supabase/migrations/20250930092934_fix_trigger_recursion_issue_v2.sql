/*
  # Fix trigger recursion and permission issues

  1. Problems
    - ALTER TABLE commands fail with RLS (permission denied)
    - Triggers create infinite recursion loops
    - INSERT trigger calls UPDATE which triggers UPDATE trigger

  2. Solution
    - Use session variable to track if we're in a recalculation
    - Combine both triggers into single logic
    - Skip recalculation if already in progress
    - Remove ALTER TABLE commands (incompatible with RLS)

  3. Approach
    - Set flag at start of recalculation
    - Check flag before doing any recalculation
    - Clear flag at end
    - Works for both INSERT and UPDATE scenarios
*/

-- Drop old triggers and functions
DROP TRIGGER IF EXISTS recalculate_family_discounts_trigger ON comedor_inscripciones;
DROP TRIGGER IF EXISTS recalculate_family_discounts_on_update_trigger ON comedor_inscripciones;
DROP TRIGGER IF EXISTS apply_family_discounts_on_insert ON comedor_inscripciones;
DROP TRIGGER IF EXISTS apply_family_discounts_on_update ON comedor_inscripciones;
DROP FUNCTION IF EXISTS recalculate_family_discounts();
DROP FUNCTION IF EXISTS recalculate_family_discounts_on_update();
DROP FUNCTION IF EXISTS apply_family_discounts();

-- Create unified function with recursion protection
CREATE OR REPLACE FUNCTION apply_family_discounts()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  total_inscripciones integer;
  is_recalculating text;
BEGIN
  -- Check if we're already recalculating (prevent infinite recursion)
  is_recalculating := current_setting('app.recalculating_discounts', true);
  
  IF is_recalculating = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- For UPDATE, only proceed if 'activo' changed
  IF TG_OP = 'UPDATE' AND (OLD.activo IS NOT DISTINCT FROM NEW.activo) THEN
    RETURN NEW;
  END IF;
  
  -- Set flag to prevent recursion
  PERFORM set_config('app.recalculating_discounts', 'true', true);
  
  -- Get padre_id for this inscription
  SELECT padre_id INTO padre_id_hijo
  FROM hijos
  WHERE id = NEW.hijo_id;
  
  -- Count total active inscriptions for this family
  SELECT COUNT(*) INTO total_inscripciones
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true;
  
  -- Get configured discount percentage
  SELECT descuento_tercer_hijo INTO descuento_porcentaje
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  posicion := 1;
  
  -- Loop through all active inscriptions ordered by cost (most expensive first)
  FOR inscripcion_record IN
    SELECT 
      ci.id,
      ci.hijo_id,
      array_length(ci.dias_semana, 1) as num_dias,
      ci.created_at
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true
    ORDER BY 
      (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
      ci.created_at ASC
  LOOP
    -- Get base price for this number of days
    SELECT precio INTO precio_base_calculado
    FROM configuracion_precios
    WHERE activo = true
      AND inscripcion_record.num_dias >= dias_min
      AND inscripcion_record.num_dias <= dias_max
    ORDER BY dias_min
    LIMIT 1;
    
    IF precio_base_calculado IS NULL THEN
      precio_base_calculado := 9.15;
    END IF;
    
    -- Apply discount if position >= 3 AND total >= 3
    IF posicion >= 3 AND total_inscripciones >= 3 THEN
      UPDATE comedor_inscripciones
      SET 
        precio_diario = precio_base_calculado * (1 - descuento_porcentaje / 100),
        descuento_aplicado = descuento_porcentaje
      WHERE id = inscripcion_record.id;
    ELSE
      -- No discount (either position < 3 OR total < 3)
      UPDATE comedor_inscripciones
      SET 
        precio_diario = precio_base_calculado,
        descuento_aplicado = 0
      WHERE id = inscripcion_record.id;
    END IF;
    
    posicion := posicion + 1;
  END LOOP;
  
  -- Clear flag
  PERFORM set_config('app.recalculating_discounts', 'false', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT
CREATE TRIGGER apply_family_discounts_on_insert
  AFTER INSERT ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION apply_family_discounts();

-- Create trigger for UPDATE
CREATE TRIGGER apply_family_discounts_on_update
  AFTER UPDATE ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION apply_family_discounts();

-- Recalculate existing data
DO $$
DECLARE
  familia_record RECORD;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  total_inscripciones integer;
BEGIN
  -- Get configured discount
  SELECT descuento_tercer_hijo INTO descuento_porcentaje
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  -- For each family
  FOR familia_record IN 
    SELECT DISTINCT h.padre_id
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE ci.activo = true
  LOOP
    -- Count active inscriptions
    SELECT COUNT(*) INTO total_inscripciones
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = familia_record.padre_id
      AND ci.activo = true;
    
    posicion := 1;
    
    -- Order by cost DESC
    FOR inscripcion_record IN
      SELECT 
        ci.id,
        array_length(ci.dias_semana, 1) as num_dias
      FROM comedor_inscripciones ci
      JOIN hijos h ON h.id = ci.hijo_id
      WHERE h.padre_id = familia_record.padre_id
        AND ci.activo = true
      ORDER BY 
        (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
        ci.created_at ASC
    LOOP
      -- Get base price
      SELECT precio INTO precio_base_calculado
      FROM configuracion_precios
      WHERE activo = true
        AND inscripcion_record.num_dias >= dias_min
        AND inscripcion_record.num_dias <= dias_max
      ORDER BY dias_min
      LIMIT 1;
      
      IF precio_base_calculado IS NULL THEN
        precio_base_calculado := 9.15;
      END IF;
      
      -- Apply discount if position >= 3 AND total >= 3
      IF posicion >= 3 AND total_inscripciones >= 3 THEN
        UPDATE comedor_inscripciones
        SET 
          precio_diario = precio_base_calculado * (1 - descuento_porcentaje / 100),
          descuento_aplicado = descuento_porcentaje
        WHERE id = inscripcion_record.id;
      ELSE
        UPDATE comedor_inscripciones
        SET 
          precio_diario = precio_base_calculado,
          descuento_aplicado = 0
        WHERE id = inscripcion_record.id;
      END IF;
      
      posicion := posicion + 1;
    END LOOP;
  END LOOP;
END $$;