/*
  # Fix trigger recursion without using ALTER TABLE

  1. Problem
    - Triggers use ALTER TABLE to disable/enable triggers to avoid recursion
    - ALTER TABLE requires table ownership which users don't have
    - This causes "must be owner of table" error when users try to insert/update

  2. Solution
    - Use a different approach to avoid recursion: check if we're already recalculating
    - Use a session variable to track if we're in recalculation mode
    - Skip recalculation if already processing

  3. Changes
    - Remove all ALTER TABLE commands from triggers
    - Use pg_temp session variables to track recursion state
*/

-- Update the apply_family_discounts function to avoid recursion without ALTER TABLE
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
  is_processing boolean;
BEGIN
  -- Check if we're already processing to avoid recursion
  BEGIN
    is_processing := current_setting('app.processing_family_discounts', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      is_processing := false;
  END;
  
  IF is_processing THEN
    RETURN NEW;
  END IF;
  
  -- Set flag to indicate we're processing
  PERFORM set_config('app.processing_family_discounts', 'true', true);
  
  -- Get padre_id
  SELECT h.padre_id
  INTO padre_id_hijo
  FROM hijos h
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
  
  -- Clear the processing flag
  PERFORM set_config('app.processing_family_discounts', 'false', true);
  
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
  is_processing boolean;
BEGIN
  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    -- Check if we're already processing to avoid recursion
    BEGIN
      is_processing := current_setting('app.processing_family_discounts', true)::boolean;
    EXCEPTION
      WHEN OTHERS THEN
        is_processing := false;
    END;
    
    IF is_processing THEN
      RETURN NEW;
    END IF;
    
    -- Set flag to indicate we're processing
    PERFORM set_config('app.processing_family_discounts', 'true', true);
    
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
    
    -- Clear the processing flag
    PERFORM set_config('app.processing_family_discounts', 'false', true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;