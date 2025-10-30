/*
  # Add Real-Time Attendance Functions

  ## New Functions

  ### 1. obtener_resumen_control_mes_actual
  Gets real-time attendance summary for all enrolled students in a given month.
  Calculates attendance on-the-fly without needing to process the month first.
  Defaults to current month if no parameters provided.

  ### 2. obtener_alertas_asistencia_mes_actual
  Gets real-time alerts for students below 80% attendance in current month.
  Shows live data to help identify at-risk students early.

  ## Purpose

  These functions enable the admin attendance control interface to show live data
  automatically without requiring manual processing. The "Process Control" button
  is now only used to officially close the month and save historical records.

  ## Security

  Both functions are restricted to administrators only via RLS checks.
*/

-- Function to get real-time attendance summary for all enrolled students
CREATE OR REPLACE FUNCTION obtener_resumen_control_mes_actual(
  p_anio integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  hijo_id uuid,
  hijo_nombre text,
  hijo_curso text,
  padre_nombre text,
  es_hijo_personal boolean,
  dias_asistidos integer,
  dias_inscritos integer,
  porcentaje_asistencia numeric,
  cumple_80_porciento boolean,
  precio_antes numeric,
  precio_despues numeric,
  observaciones text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio integer;
  v_mes integer;
  v_hijo record;
  v_calculo record;
  v_precio_config record;
BEGIN
  -- Only administrators
  IF NOT EXISTS (
    SELECT 1 FROM administradores
    WHERE email = auth.email() AND activo = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- Default to current month if not specified
  IF p_anio IS NULL OR p_mes IS NULL THEN
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE);
    v_mes := EXTRACT(MONTH FROM CURRENT_DATE);
  ELSE
    v_anio := p_anio;
    v_mes := p_mes;
  END IF;

  -- Get price configuration
  SELECT * INTO v_precio_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;

  -- Iterate over all enrolled children
  FOR v_hijo IN
    SELECT DISTINCT
      h.id as hijo_id,
      h.nombre as hijo_nombre,
      g.nombre as hijo_curso,
      p.nombre as padre_nombre,
      COALESCE(p.es_personal, false) as es_hijo_personal,
      ci.precio_aplicado
    FROM hijos h
    JOIN comedor_inscripciones ci ON h.id = ci.hijo_id
    LEFT JOIN grados g ON h.grado_id = g.id
    LEFT JOIN padres p ON h.padre_id = p.id
    WHERE ci.activo = true
      AND ci.fecha_inicio <= make_date(v_anio, v_mes, 1) + interval '1 month' - interval '1 day'
      AND (ci.fecha_fin IS NULL OR ci.fecha_fin >= make_date(v_anio, v_mes, 1))
    ORDER BY h.nombre
  LOOP
    -- Calculate attendance for this child
    SELECT * INTO v_calculo
    FROM calcular_asistencia_mensual_hijo(v_hijo.hijo_id, v_anio, v_mes);

    -- Skip if no data
    IF v_calculo.dias_inscrito = 0 THEN
      CONTINUE;
    END IF;

    -- Return row with calculated data
    RETURN QUERY SELECT
      v_hijo.hijo_id,
      v_hijo.hijo_nombre,
      v_hijo.hijo_curso,
      v_hijo.padre_nombre,
      v_hijo.es_hijo_personal,
      v_calculo.dias_asistidos,
      v_calculo.dias_inscrito as dias_inscritos,
      v_calculo.porcentaje_asistencia,
      v_calculo.cumple_80_porciento,
      v_calculo.precio_actual as precio_antes,
      CASE
        WHEN v_hijo.es_hijo_personal THEN v_calculo.precio_actual
        WHEN v_calculo.cumple_80_porciento THEN v_calculo.precio_actual
        ELSE COALESCE(v_precio_config.precio_sin_descuento, 9.15)
      END as precio_despues,
      CASE
        WHEN v_hijo.es_hijo_personal THEN 'Hijo de personal - Exento del control'
        WHEN v_calculo.cumple_80_porciento THEN 'Cumple con el 80% - Mantiene descuento'
        WHEN v_calculo.porcentaje_asistencia >= 70 THEN 'Por debajo del 80% - Perderá descuento'
        ELSE 'Muy por debajo del 80% - Perderá descuento'
      END as observaciones;
  END LOOP;
END;
$$;

-- Function to get real-time alerts for students below 80%
CREATE OR REPLACE FUNCTION obtener_alertas_asistencia_mes_actual(
  p_anio integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  hijo_id uuid,
  hijo_nombre text,
  hijo_curso text,
  padre_nombre text,
  padre_email text,
  porcentaje_asistencia numeric,
  dias_asistidos integer,
  dias_inscritos integer,
  esta_en_riesgo boolean,
  mensaje text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio integer;
  v_mes integer;
  v_hijo record;
  v_calculo record;
BEGIN
  -- Only administrators
  IF NOT EXISTS (
    SELECT 1 FROM administradores
    WHERE email = auth.email() AND activo = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- Default to current month if not specified
  IF p_anio IS NULL OR p_mes IS NULL THEN
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE);
    v_mes := EXTRACT(MONTH FROM CURRENT_DATE);
  ELSE
    v_anio := p_anio;
    v_mes := p_mes;
  END IF;

  -- Iterate over all enrolled children
  FOR v_hijo IN
    SELECT DISTINCT
      h.id as hijo_id,
      h.nombre as hijo_nombre,
      g.nombre as hijo_curso,
      p.nombre as padre_nombre,
      p.email as padre_email,
      COALESCE(p.es_personal, false) as es_hijo_personal
    FROM hijos h
    JOIN comedor_inscripciones ci ON h.id = ci.hijo_id
    LEFT JOIN grados g ON h.grado_id = g.id
    LEFT JOIN padres p ON h.padre_id = p.id
    WHERE ci.activo = true
      AND ci.fecha_inicio <= make_date(v_anio, v_mes, 1) + interval '1 month' - interval '1 day'
      AND (ci.fecha_fin IS NULL OR ci.fecha_fin >= make_date(v_anio, v_mes, 1))
  LOOP
    -- Calculate attendance for this child
    SELECT * INTO v_calculo
    FROM calcular_asistencia_mensual_hijo(v_hijo.hijo_id, v_anio, v_mes);

    -- Skip if no data or child of staff
    IF v_calculo.dias_inscrito = 0 OR v_hijo.es_hijo_personal THEN
      CONTINUE;
    END IF;

    -- Only return if below 85% (to show warnings)
    IF v_calculo.porcentaje_asistencia < 85 THEN
      RETURN QUERY SELECT
        v_hijo.hijo_id,
        v_hijo.hijo_nombre,
        v_hijo.hijo_curso,
        v_hijo.padre_nombre,
        v_hijo.padre_email,
        v_calculo.porcentaje_asistencia,
        v_calculo.dias_asistidos,
        v_calculo.dias_inscrito as dias_inscritos,
        (v_calculo.porcentaje_asistencia < 80) as esta_en_riesgo,
        CASE
          WHEN v_calculo.porcentaje_asistencia < 70 THEN 'CRÍTICO: Muy por debajo del 80%'
          WHEN v_calculo.porcentaje_asistencia < 80 THEN 'ALERTA: Por debajo del 80%'
          ELSE 'Precaución: Cerca del límite'
        END as mensaje;
    END IF;
  END LOOP;
END;
$$;

-- Add comments
COMMENT ON FUNCTION obtener_resumen_control_mes_actual IS
  'Obtiene resumen en tiempo real de asistencia para todos los alumnos inscritos. No requiere procesamiento previo.';

COMMENT ON FUNCTION obtener_alertas_asistencia_mes_actual IS
  'Obtiene alertas en tiempo real de alumnos con asistencia baja (menos de 85%). Solo administradores.';
