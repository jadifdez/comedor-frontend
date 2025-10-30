/*
  # Fix family discount to recalculate ALL inscriptions

  1. Problem
    - Current trigger only evaluates discount at INSERT time
    - When a new inscription is added, it doesn't recalculate existing ones
    - This causes the wrong child to get the discount

  2. Solution
    - Create a trigger that runs AFTER INSERT on comedor_inscripciones
    - This trigger recalculates discounts for ALL active inscriptions of the family
    - Ensures the 2 most expensive remain at full price
    - Applies discount to 3rd+ most expensive inscriptions

  3. Logic
    - When a new inscription is added, recalculate ALL active inscriptions
    - Order by cost DESC (precio * dias)
    - Keep first 2 at full price (0% discount)
    - Apply configured discount to positions 3+
*/

-- Create function to recalculate family discounts after insert
CREATE OR REPLACE FUNCTION recalculate_family_discounts()
RETURNS TRIGGER AS $$
DECLARE
  padre_id_hijo uuid;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  total_inscripciones integer;
BEGIN
  -- Get padre_id for the new inscription
  SELECT padre_id INTO padre_id_hijo
  FROM hijos
  WHERE id = NEW.hijo_id;
  
  -- Count total active inscriptions for this family
  SELECT COUNT(*) INTO total_inscripciones
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = padre_id_hijo
    AND ci.activo = true;
  
  -- Only recalculate if family has 3+ inscriptions
  IF total_inscripciones >= 3 THEN
    -- Get configured discount percentage
    SELECT descuento_tercer_hijo INTO descuento_porcentaje
    FROM configuracion_precios
    WHERE activo = true
    LIMIT 1;
    
    IF descuento_porcentaje IS NULL THEN
      descuento_porcentaje := 0;
    END IF;
    
    -- Disable trigger to avoid recursion
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER recalculate_family_discounts_trigger';
    
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
      
      -- Apply discount if position >= 3
      IF posicion >= 3 THEN
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
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
    EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create AFTER INSERT trigger
DROP TRIGGER IF EXISTS recalculate_family_discounts_trigger ON comedor_inscripciones;
CREATE TRIGGER recalculate_family_discounts_trigger
  AFTER INSERT ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_family_discounts();

-- Execute recalculation for existing families with 3+ children
DO $$
DECLARE
  familia_record RECORD;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
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
  
  -- For each family with 3+ active inscriptions
  FOR familia_record IN 
    SELECT h.padre_id, COUNT(*) as total
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE ci.activo = true
    GROUP BY h.padre_id
    HAVING COUNT(*) >= 3
  LOOP
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
      
      -- Apply discount if position >= 3
      IF posicion >= 3 THEN
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
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER recalculate_family_discounts_trigger';
END $$;