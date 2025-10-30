/*
  # Actualizar inscripciones existentes al precio unificado de 9.15€
  
  ## Resumen
  Esta migración actualiza retroactivamente todas las inscripciones de alumnos que
  tienen un precio_diario de 7.50€ (para asistencias de 4-5 días) al nuevo precio
  unificado de 9.15€.
  
  ## Proceso
  1. Crear función temporal para actualizar inscripciones sin activar triggers de familia
  2. Actualizar precio_diario de 7.50€ a 9.15€ en todas las inscripciones
  3. Recalcular descuentos familiares para las familias afectadas
  4. Limpiar función temporal
  
  ## Impacto
  - Afecta solo a inscripciones de alumnos con precio 7.50€
  - NO afecta a inscripciones de hijos de personal (precio_hijo_personal)
  - NO afecta a inscripciones de padres adultos (precio_adulto)
  - Los descuentos familiares se recalculan automáticamente
  
  ## Notas
  - Este cambio es retroactivo e inmediato
  - No hay período de transición
  - No se mantiene registro histórico del precio anterior
*/

-- Función para recalcular descuentos por padre
CREATE OR REPLACE FUNCTION apply_family_discounts_for_padre(p_padre_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inscripcion_record RECORD;
  posicion integer;
  descuento_porcentaje numeric(5,2);
  precio_base_calculado numeric(10,2);
  precio_hijo_personal_config numeric(10,2);
  total_inscripciones integer;
BEGIN
  -- Establecer flag para evitar recursión en triggers
  PERFORM set_config('app.processing_family_discounts', 'true', true);

  -- Obtener configuración de precios
  SELECT descuento_tercer_hijo, precio_hijo_personal
  INTO descuento_porcentaje, precio_hijo_personal_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;

  IF descuento_porcentaje IS NULL THEN
    descuento_porcentaje := 0;
  END IF;

  IF precio_hijo_personal_config IS NULL THEN
    PERFORM set_config('app.processing_family_discounts', 'false', true);
    RAISE EXCEPTION 'No se encontró configuración de precios activa';
  END IF;

  -- Contar inscripciones activas de esta familia
  SELECT COUNT(*) INTO total_inscripciones
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE h.padre_id = p_padre_id
    AND ci.activo = true;

  posicion := 1;

  -- Procesar todas las inscripciones de esta familia
  FOR inscripcion_record IN
    SELECT
      ci.id,
      ci.hijo_id,
      array_length(ci.dias_semana, 1) as num_dias,
      p.es_personal as hijo_es_de_personal
    FROM comedor_inscripciones ci
    JOIN hijos h ON h.id = ci.hijo_id
    JOIN padres p ON p.id = h.padre_id
    WHERE h.padre_id = p_padre_id
      AND ci.activo = true
    ORDER BY
      (CAST(ci.precio_diario AS numeric) * array_length(ci.dias_semana, 1)) DESC,
      ci.created_at ASC
  LOOP
    -- Determinar precio base
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
        PERFORM set_config('app.processing_family_discounts', 'false', true);
        RAISE EXCEPTION 'No se encontró configuración de precio para % días', inscripcion_record.num_dias;
      END IF;
    END IF;

    -- Aplicar descuento si posición >= 3 Y total >= 3
    IF posicion >= 3 AND total_inscripciones >= 3 THEN
      UPDATE comedor_inscripciones
      SET
        precio_diario = precio_base_calculado * (1 - descuento_porcentaje / 100),
        descuento_aplicado = descuento_porcentaje,
        updated_at = now()
      WHERE id = inscripcion_record.id;
    ELSE
      UPDATE comedor_inscripciones
      SET
        precio_diario = precio_base_calculado,
        descuento_aplicado = 0,
        updated_at = now()
      WHERE id = inscripcion_record.id;
    END IF;

    posicion := posicion + 1;
  END LOOP;

  -- Limpiar flag
  PERFORM set_config('app.processing_family_discounts', 'false', true);
END;
$$;

-- Actualizar inscripciones con precio 7.50€ a 9.15€
DO $$
DECLARE
  v_padre_id uuid;
  v_affected_families uuid[];
  v_updated_count integer;
BEGIN
  -- Recopilar IDs de padres afectados
  SELECT ARRAY_AGG(DISTINCT h.padre_id)
  INTO v_affected_families
  FROM comedor_inscripciones ci
  JOIN hijos h ON h.id = ci.hijo_id
  WHERE ci.precio_diario = 7.50;

  -- Actualizar inscripciones directamente (el precio base, sin considerar descuentos aún)
  -- Solo actualizamos las que tienen exactamente 7.50€ para no afectar las que ya tienen descuento
  UPDATE comedor_inscripciones
  SET 
    precio_diario = 9.15,
    updated_at = now()
  WHERE precio_diario = 7.50;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Recalcular descuentos familiares para las familias afectadas
  IF v_affected_families IS NOT NULL THEN
    FOREACH v_padre_id IN ARRAY v_affected_families
    LOOP
      -- Llamar a la función de recálculo para cada familia
      PERFORM apply_family_discounts_for_padre(v_padre_id);
    END LOOP;
  END IF;

  RAISE NOTICE 'Actualización completada. Inscripciones actualizadas: %. Familias recalculadas: %', 
    v_updated_count, 
    COALESCE(array_length(v_affected_families, 1), 0);
END $$;
