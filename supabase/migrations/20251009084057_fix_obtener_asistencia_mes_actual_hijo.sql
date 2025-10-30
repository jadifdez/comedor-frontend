/*
  # Corregir función obtener_asistencia_mes_actual_hijo para manejar casos edge

  ## Problema
  La función no maneja correctamente cuando:
  - Un hijo tiene inscripción activa pero no hay días inscritos aún en el mes
  - La inscripción comienza a mitad de mes
  - Todos los días hasta ahora han sido festivos o no laborables
  
  ## Solución
  - Verificar primero si existe inscripción activa
  - Devolver mensaje informativo cuando hay inscripción pero no días transcurridos
  - Manejar correctamente el caso de inscripción NULL
  - Asegurar que siempre devuelva JSON válido y útil

  ## Cambios
  - Se verifica explícitamente la existencia de inscripción activa antes de calcular
  - Se devuelve JSON informativo cuando no hay inscripción
  - Se manejan correctamente los casos donde dias_inscrito = 0 pero hay inscripción
*/

-- Función mejorada para calcular asistencia del mes actual de un hijo
CREATE OR REPLACE FUNCTION obtener_asistencia_mes_actual_hijo(
  p_hijo_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio integer;
  v_mes integer;
  v_calculo record;
  v_tiene_inscripcion boolean;
  v_es_personal boolean;
BEGIN
  -- Verificar permisos: padre del hijo o administrador
  IF NOT (
    EXISTS (
      SELECT 1 FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE h.id = p_hijo_id AND p.email = auth.email()
    )
    OR
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email() AND activo = true
    )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. No tiene permisos para ver esta información.';
  END IF;
  
  -- Obtener mes actual
  v_anio := EXTRACT(YEAR FROM CURRENT_DATE);
  v_mes := EXTRACT(MONTH FROM CURRENT_DATE);
  
  -- Verificar si el hijo tiene inscripción activa
  SELECT EXISTS (
    SELECT 1 FROM comedor_inscripciones i
    WHERE i.hijo_id = p_hijo_id
      AND i.activo = true
      AND i.fecha_inicio <= make_date(v_anio, v_mes, 1) + interval '1 month' - interval '1 day'
      AND (i.fecha_fin IS NULL OR i.fecha_fin >= make_date(v_anio, v_mes, 1))
  ) INTO v_tiene_inscripcion;
  
  -- Verificar si es hijo de personal
  SELECT COALESCE(p.es_personal, false)
  INTO v_es_personal
  FROM hijos h
  LEFT JOIN padres p ON h.padre_id = p.id
  WHERE h.id = p_hijo_id;
  
  -- Si NO tiene inscripción activa, devolver JSON informativo
  IF NOT v_tiene_inscripcion THEN
    RETURN json_build_object(
      'hijo_id', p_hijo_id,
      'periodo', v_anio::text || '-' || lpad(v_mes::text, 2, '0'),
      'dias_inscritos', 0,
      'dias_asistidos', 0,
      'dias_faltados', 0,
      'dias_baja', 0,
      'dias_invitacion', 0,
      'porcentaje_asistencia', 0,
      'cumple_80_porciento', true,
      'es_hijo_personal', v_es_personal,
      'en_riesgo', false,
      'tiene_inscripcion', false,
      'mensaje', 'No hay inscripción activa para este mes'
    );
  END IF;
  
  -- Calcular asistencia
  SELECT * INTO v_calculo
  FROM calcular_asistencia_mensual_hijo(p_hijo_id, v_anio, v_mes);
  
  -- Si la función devolvió inscripcion_activa_id NULL (no debería pasar pero por seguridad)
  IF v_calculo.inscripcion_activa_id IS NULL THEN
    RETURN json_build_object(
      'hijo_id', p_hijo_id,
      'periodo', v_anio::text || '-' || lpad(v_mes::text, 2, '0'),
      'dias_inscritos', 0,
      'dias_asistidos', 0,
      'dias_faltados', 0,
      'dias_baja', 0,
      'dias_invitacion', 0,
      'porcentaje_asistencia', 0,
      'cumple_80_porciento', true,
      'es_hijo_personal', v_es_personal,
      'en_riesgo', false,
      'tiene_inscripcion', false,
      'mensaje', 'No hay inscripción activa para este mes'
    );
  END IF;
  
  -- Retornar JSON con datos calculados
  RETURN json_build_object(
    'hijo_id', v_calculo.hijo_id,
    'periodo', v_calculo.periodo,
    'dias_inscritos', v_calculo.dias_inscrito,
    'dias_asistidos', v_calculo.dias_asistidos,
    'dias_faltados', v_calculo.dias_faltados,
    'dias_baja', v_calculo.dias_baja,
    'dias_invitacion', v_calculo.dias_invitacion,
    'porcentaje_asistencia', ROUND(v_calculo.porcentaje_asistencia, 2),
    'cumple_80_porciento', v_calculo.cumple_80_porciento,
    'es_hijo_personal', v_calculo.es_hijo_personal,
    'en_riesgo', (v_calculo.porcentaje_asistencia < 80 AND NOT v_calculo.es_hijo_personal),
    'tiene_inscripcion', true,
    'mensaje', CASE 
      WHEN v_calculo.dias_inscrito = 0 THEN 'Inscripción activa - Aún no hay días contables en este mes'
      WHEN v_calculo.es_hijo_personal THEN 'Hijo de personal - Exento del control'
      WHEN v_calculo.porcentaje_asistencia >= 90 THEN '¡Excelente asistencia!'
      WHEN v_calculo.porcentaje_asistencia >= 80 THEN 'Cumple con el 80% de asistencia'
      WHEN v_calculo.porcentaje_asistencia >= 70 THEN 'ALERTA: Por debajo del 80%'
      ELSE 'CRÍTICO: Muy por debajo del 80%'
    END
  );
END;
$$;

COMMENT ON FUNCTION obtener_asistencia_mes_actual_hijo IS 
  'Calcula la asistencia del mes actual de un hijo en tiempo real. Maneja correctamente casos donde hay inscripción pero no días transcurridos. Padres y administradores.';
