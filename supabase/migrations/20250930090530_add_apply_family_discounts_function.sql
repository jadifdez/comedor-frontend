/*
  # Add function to recalculate family discounts

  1. New Function
    - apply_family_discounts() - Recalculates and applies discounts to all active inscriptions
    - This function bypasses the trigger to update existing inscriptions
    
  2. Logic
    - For each family with 3+ active inscriptions
    - Order by cost (price * days) DESC, then by creation date
    - Apply discount to 3rd and subsequent inscriptions
*/

CREATE OR REPLACE FUNCTION apply_family_discounts()
RETURNS void AS $$
DECLARE
  familia_record RECORD;
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
BEGIN
  -- Get configured discount percentage
  SELECT descuento_tercer_hijo INTO descuento_porcentaje
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;
  
  -- Disable trigger temporarily to avoid recursion
  EXECUTE 'ALTER TABLE comedor_inscripciones DISABLE TRIGGER set_inscripcion_precio';
  
  -- For each family with 3 or more active inscriptions
  FOR familia_record IN 
    SELECT h.padre_id, COUNT(*) as total_inscripciones
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    WHERE ci.activo = true
    GROUP BY h.padre_id
    HAVING COUNT(*) >= 3
  LOOP
    posicion := 1;
    
    -- Order inscriptions by cost DESC, then by creation date
    FOR inscripcion_record IN
      SELECT 
        ci.id,
        ci.dias_semana,
        array_length(ci.dias_semana, 1) as num_dias,
        ci.created_at
      FROM comedor_inscripciones ci
      JOIN hijos h ON h.id = ci.hijo_id
      WHERE h.padre_id = familia_record.padre_id
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
  END LOOP;
  
  -- Re-enable trigger
  EXECUTE 'ALTER TABLE comedor_inscripciones ENABLE TRIGGER set_inscripcion_precio';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to apply discounts to existing inscriptions
SELECT apply_family_discounts();