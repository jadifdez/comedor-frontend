/*
  # Fix pricing for children of personal staff - no family discount

  1. Problem
    - Children of school staff (padres with es_personal=true) are getting family discounts
    - They should have a fixed price per day (precio_hijo_personal) regardless of family size
    - Family discount system should NOT apply to children of personal staff
    - Currently showing incorrect prices (9.15€ instead of 4€)

  2. Solution
    - Update existing inscriptions for children of personal to use precio_hijo_personal
    - Remove any discount applied to children of personal staff
    - Modify triggers to exclude children of personal from family discount logic

  3. Changes
    - Fix existing data for children of personal staff
    - Update triggers to check if parent is personal before applying discounts
*/

-- First, fix existing data for children of personal staff
DO $$
DECLARE
  personal_child_inscription RECORD;
  precio_hijo_personal_config numeric(10,2);
BEGIN
  -- Get configured price for children of personal
  SELECT precio_hijo_personal INTO precio_hijo_personal_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF precio_hijo_personal_config IS NULL THEN
    precio_hijo_personal_config := 4.00;
  END IF;
  
  -- Update all active inscriptions for children of personal staff
  FOR personal_child_inscription IN
    SELECT ci.id
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    JOIN padres p ON p.id = h.padre_id
    WHERE p.es_personal = true
      AND ci.activo = true
  LOOP
    UPDATE comedor_inscripciones
    SET 
      precio_diario = precio_hijo_personal_config,
      descuento_aplicado = 0
    WHERE id = personal_child_inscription.id;
  END LOOP;
END $$;

-- Update the trigger function to exclude children of personal from family discounts
CREATE OR REPLACE FUNCTION apply_family_discounts()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  precio_hijo_personal_config numeric(10,2);
  total_inscripciones integer;
  es_padre_personal boolean;
BEGIN
  -- Get padre_id and check if parent is personal staff
  SELECT h.padre_id, p.es_personal 
  INTO padre_id_hijo, es_padre_personal
  FROM hijos h
  JOIN padres p ON p.id = h.padre_id
  WHERE h.id = NEW.hijo_id;
  
  -- If parent is personal staff, use fixed price and skip family discount logic
  IF es_padre_personal THEN
    SELECT precio_hijo_personal INTO precio_hijo_personal_config
    FROM configuracion_precios
    WHERE activo = true
    LIMIT 1;
    
    IF precio_hijo_personal_config IS NULL THEN
      precio_hijo_personal_config := 4.00;
    END IF;
    
    NEW.precio_diario := precio_hijo_personal_config;
    NEW.descuento_aplicado := 0;
    RETURN NEW;
  END IF;
  
  -- Original family discount logic for non-personal families
  SELECT COUNT(*) INTO total_inscripciones
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true;
  
  SELECT descuento_tercer_hijo INTO descuento_porcentaje
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_trigger';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_on_update_trigger';
  
  posicion := 1;
  
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
  
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_on_update_trigger';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the recalculate on update trigger to exclude children of personal
CREATE OR REPLACE FUNCTION recalculate_family_discounts_on_update()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  es_padre_personal boolean;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  precio_hijo_personal_config numeric(10,2);
  total_inscripciones integer;
BEGIN
  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    -- Get padre_id and check if parent is personal
    SELECT h.padre_id, p.es_personal 
    INTO padre_id_hijo, es_padre_personal
    FROM hijos h
    JOIN padres p ON p.id = h.padre_id
    WHERE h.id = NEW.hijo_id;
    
    -- If parent is personal, just ensure correct pricing
    IF es_padre_personal THEN
      SELECT precio_hijo_personal INTO precio_hijo_personal_config
      FROM configuracion_precios
      WHERE activo = true
      LIMIT 1;
      
      IF precio_hijo_personal_config IS NULL THEN
        precio_hijo_personal_config := 4.00;
      END IF;
      
      -- Update all active inscriptions for this personal parent's children
      UPDATE comedor_inscripciones ci
      SET 
        precio_diario = precio_hijo_personal_config,
        descuento_aplicado = 0
      FROM hijos h
      WHERE h.id = ci.hijo_id
        AND h.padre_id = padre_id_hijo
        AND ci.activo = true;
      
      RETURN NEW;
    END IF;
    
    -- Original recalculation logic for non-personal families
    SELECT COUNT(*) INTO total_inscripciones
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true;
    
    SELECT descuento_tercer_hijo INTO descuento_porcentaje
    FROM configuracion_precios
    WHERE activo = true
    LIMIT 1;
    
    IF descuento_porcentaje IS NULL THEN
      descuento_porcentaje := 0;
    END IF;
    
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_trigger';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_on_update_trigger';
    
    posicion := 1;
    
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
    
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_on_update_trigger';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;