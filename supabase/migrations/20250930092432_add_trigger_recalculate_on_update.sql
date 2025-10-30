/*
  # Add trigger to recalculate discounts on UPDATE

  1. Problem
    - When an inscription is deactivated (activo = false), discounts are not recalculated
    - This leaves incorrect discounts on remaining active inscriptions
    - Example: Family with 3 kids gets discount, then one cancels, but discount remains

  2. Solution
    - Add AFTER UPDATE trigger that detects changes to 'activo' field
    - When activo changes, recalculate all family discounts
    - Reuse existing recalculate function with same logic

  3. Logic
    - Trigger fires on UPDATE of comedor_inscripciones
    - Only recalculates if 'activo' field changed
    - Recalculates for entire family
    - If < 3 active inscriptions, removes all discounts
    - If >= 3 active inscriptions, applies discount to 3rd+ cheapest
*/

-- Create function to recalculate family discounts after update
CREATE OR REPLACE FUNCTION recalculate_family_discounts_on_update()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  total_inscripciones integer;
BEGIN
  -- Only proceed if 'activo' field changed
  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
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
    
    -- Disable triggers to avoid recursion
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_trigger';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_on_update_trigger';
    
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
    
    -- Re-enable triggers
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_on_update_trigger';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create AFTER UPDATE trigger
DROP TRIGGER IF EXISTS recalculate_family_discounts_on_update_trigger ON comedor_inscripciones;
CREATE TRIGGER recalculate_family_discounts_on_update_trigger
  AFTER UPDATE ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_family_discounts_on_update();

-- Fix existing data: recalculate all families
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
  
  -- Disable triggers
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_trigger';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_on_update_trigger';
  
  -- For each family (regardless of number of inscriptions)
  FOR familia_record IN 
    SELECT DISTINCT h.padre_id
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE ci.activo = true
  LOOP
    -- Count active inscriptions for this family
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
        -- No discount
        UPDATE comedor_inscripciones
        SET 
          precio_diario = precio_base_calculado,
          descuento_aplicado = 0
        WHERE id = inscripcion_record.id;
      END IF;
      
      posicion := posicion + 1;
    END LOOP;
  END LOOP;
  
  -- Re-enable triggers
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_on_update_trigger';
END $$;