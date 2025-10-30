/*
  # Allow family discount for children of personal staff

  1. Problem
    - Children of personal staff were excluded from family discount system
    - They should participate in family discounts but applied to their special price (4€)
    - Example: Personal staff with 3+ kids should get discount on 3rd+ child at 4€ base

  2. Solution
    - Modify triggers to include children of personal in family discount calculation
    - Use precio_hijo_personal as base price instead of regular price
    - Apply family discount percentage to the special price

  3. Logic
    - For personal staff children: base_price = precio_hijo_personal (4€)
    - For regular children: base_price = configured price based on days
    - Apply family discount (if 3+ children) to position 3+ on sorted list
*/

-- Update trigger function for INSERT to include personal children in family discount calculation
CREATE OR REPLACE FUNCTION apply_family_discounts()
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
  -- Get padre_id and check if parent is personal staff
  SELECT h.padre_id, p.es_personal 
  INTO padre_id_hijo, es_padre_personal
  FROM hijos h
  JOIN padres p ON p.id = h.padre_id
  WHERE h.id = NEW.hijo_id;
  
  -- Get configured prices
  SELECT descuento_tercer_hijo, precio_hijo_personal 
  INTO descuento_porcentaje, precio_hijo_personal_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  IF precio_hijo_personal_config IS NULL THEN
    precio_hijo_personal_config := 4.00;
  END IF;
  
  -- Count total active inscriptions for this family
  SELECT COUNT(*) INTO total_inscripciones
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true;
  
  -- Disable triggers to avoid recursion
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_insert';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_update';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
  
  posicion := 1;
  
  -- Process all inscriptions for this family
  FOR inscripcion_record IN
    SELECT 
      ci.id,
      ci.hijo_id,
      h.padre_id,
      array_length(ci.dias_semana, 1) as num_dias,
      ci.created_at,
      p.es_personal as hijo_es_de_personal
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    JOIN padres p ON p.id = h.padre_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true
    ORDER BY 
      (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
      ci.created_at ASC
  LOOP
    -- Determine base price depending on whether child is from personal staff
    IF inscripcion_record.hijo_es_de_personal THEN
      precio_base_calculado := precio_hijo_personal_config;
    ELSE
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
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_insert';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_update';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update recalculate on update trigger function
CREATE OR REPLACE FUNCTION recalculate_family_discounts_on_update()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  precio_hijo_personal_config numeric(10,2);
  total_inscripciones integer;
BEGIN
  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    -- Get padre_id
    SELECT h.padre_id 
    INTO padre_id_hijo
    FROM hijos h
    WHERE h.id = NEW.hijo_id;
    
    -- Count total active inscriptions
    SELECT COUNT(*) INTO total_inscripciones
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE h.padre_id = padre_id_hijo
      AND ci.activo = true;
    
    -- Get configured prices
    SELECT descuento_tercer_hijo, precio_hijo_personal 
    INTO descuento_porcentaje, precio_hijo_personal_config
    FROM configuracion_precios
    WHERE activo = true
    LIMIT 1;
    
    IF descuento_porcentaje IS NULL THEN
      descuento_porcentaje := 0;
    END IF;
    
    IF precio_hijo_personal_config IS NULL THEN
      precio_hijo_personal_config := 4.00;
    END IF;
    
    -- Disable triggers
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_insert';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_update';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
    
    posicion := 1;
    
    -- Process all inscriptions for this family
    FOR inscripcion_record IN
      SELECT 
        ci.id,
        ci.hijo_id,
        array_length(ci.dias_semana, 1) as num_dias,
        ci.created_at,
        p.es_personal as hijo_es_de_personal
      FROM comedor_inscripciones ci
      JOIN hijos h ON h.id = ci.hijo_id
      JOIN padres p ON p.id = h.padre_id
      WHERE h.padre_id = padre_id_hijo
        AND ci.activo = true
      ORDER BY 
        (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
        ci.created_at ASC
    LOOP
      -- Determine base price
      IF inscripcion_record.hijo_es_de_personal THEN
        precio_base_calculado := precio_hijo_personal_config;
      ELSE
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
    
    -- Re-enable triggers
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_insert';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_update';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recalculate all existing inscriptions with new logic
DO $$
DECLARE
  familia_record RECORD;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  precio_hijo_personal_config numeric(10,2);
  total_inscripciones integer;
BEGIN
  -- Get configured prices
  SELECT descuento_tercer_hijo, precio_hijo_personal 
  INTO descuento_porcentaje, precio_hijo_personal_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  IF precio_hijo_personal_config IS NULL THEN
    precio_hijo_personal_config := 4.00;
  END IF;
  
  -- Disable triggers
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_insert';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER apply_family_discounts_on_update';
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
  
  -- For each family
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
    
    -- Process inscriptions ordered by cost
    FOR inscripcion_record IN
      SELECT 
        ci.id,
        array_length(ci.dias_semana, 1) as num_dias,
        p.es_personal as hijo_es_de_personal
      FROM comedor_inscripciones ci
      JOIN hijos h ON h.id = ci.hijo_id
      JOIN padres p ON p.id = h.padre_id
      WHERE h.padre_id = familia_record.padre_id
        AND ci.activo = true
      ORDER BY 
        (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
        ci.created_at ASC
    LOOP
      -- Determine base price
      IF inscripcion_record.hijo_es_de_personal THEN
        precio_base_calculado := precio_hijo_personal_config;
      ELSE
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
  
  -- Re-enable triggers
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_insert';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER apply_family_discounts_on_update';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
END $$;