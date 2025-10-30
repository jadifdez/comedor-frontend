/*
  # Sistema de Control de Asistencia del 80% - Parte 4: Funciones RPC

  ## Funciones RPC para Consultas

  ### 1. obtener_historial_asistencia_hijo
  Obtiene el historial completo de asistencia de un hijo específico.
  Accesible por padres (solo sus hijos) y administradores (todos).

  ### 2. obtener_resumen_control_mes
  Obtiene el resumen del control de asistencia de un mes específico.
  Solo para administradores.

  ### 3. obtener_alertas_asistencia_baja
  Obtiene lista de hijos que están en riesgo de perder el descuento
  en el mes actual (por debajo del 80%).
  Solo para administradores.

  ### 4. obtener_asistencia_mes_actual_hijo
  Calcula y retorna la asistencia del mes actual de un hijo.
  Accesible por padres (sus hijos) y administradores (todos).
*/

-- Función para obtener historial de asistencia de un hijo
CREATE OR REPLACE FUNCTION obtener_historial_asistencia_hijo(
  p_hijo_id uuid,
  p_limite integer DEFAULT 12
)
RETURNS TABLE (
  periodo text,
  anio integer,
  mes integer,
  dias_asistidos integer,
  dias_inscritos integer,
  porcentaje_asistencia numeric,
  cumple_80_porciento boolean,
  precio_antes numeric,
  precio_despues numeric,
  observaciones text,
  procesado_en timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    RAISE EXCEPTION 'Acceso denegado. No tiene permisos para ver este historial.';
  END IF;
  
  -- Retornar historial ordenado por fecha descendente
  RETURN QUERY
  SELECT 
    c.periodo,
    c.anio,
    c.mes,
    c.dias_asistidos,
    c.dias_inscrito as dias_inscritos,
    c.porcentaje_asistencia,
    c.cumple_80_porciento,
    c.precio_antes,
    c.precio_despues,
    c.observaciones,
    c.procesado_en
  FROM comedor_control_asistencia_mensual c
  WHERE c.hijo_id = p_hijo_id
  ORDER BY c.anio DESC, c.mes DESC
  LIMIT p_limite;
END;
$$;

-- Función para obtener resumen del control de un mes
CREATE OR REPLACE FUNCTION obtener_resumen_control_mes(
  p_anio integer,
  p_mes integer
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
BEGIN
  -- Solo administradores
  IF NOT EXISTS (
    SELECT 1 FROM administradores
    WHERE email = auth.email() AND activo = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.hijo_id,
    h.nombre as hijo_nombre,
    g.nombre as hijo_curso,
    p.nombre as padre_nombre,
    c.es_hijo_personal,
    c.dias_asistidos,
    c.dias_inscrito as dias_inscritos,
    c.porcentaje_asistencia,
    c.cumple_80_porciento,
    c.precio_antes,
    c.precio_despues,
    c.observaciones
  FROM comedor_control_asistencia_mensual c
  JOIN hijos h ON c.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  WHERE c.anio = p_anio AND c.mes = p_mes
  ORDER BY h.nombre;
END;
$$;

-- Función para obtener alertas de asistencia baja
CREATE OR REPLACE FUNCTION obtener_alertas_asistencia_baja(
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
BEGIN
  -- Solo administradores
  IF NOT EXISTS (
    SELECT 1 FROM administradores
    WHERE email = auth.email() AND activo = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;
  
  -- Si no se especifica periodo, usar mes actual
  IF p_anio IS NULL OR p_mes IS NULL THEN
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE);
    v_mes := EXTRACT(MONTH FROM CURRENT_DATE);
  ELSE
    v_anio := p_anio;
    v_mes := p_mes;
  END IF;
  
  RETURN QUERY
  SELECT 
    h.id as hijo_id,
    h.nombre as hijo_nombre,
    g.nombre as hijo_curso,
    p.nombre as padre_nombre,
    p.email as padre_email,
    c.porcentaje_asistencia,
    c.dias_asistidos,
    c.dias_inscrito as dias_inscritos,
    (c.porcentaje_asistencia < 80 AND NOT c.es_hijo_personal) as esta_en_riesgo,
    CASE 
      WHEN c.es_hijo_personal THEN 'Hijo de personal - Exento'
      WHEN c.porcentaje_asistencia < 70 THEN 'CRÍTICO: Muy por debajo del 80%'
      WHEN c.porcentaje_asistencia < 80 THEN 'ALERTA: Por debajo del 80%'
      WHEN c.porcentaje_asistencia < 85 THEN 'Precaución: Cerca del límite'
      ELSE 'OK: Cumple con el 80%'
    END as mensaje
  FROM comedor_control_asistencia_mensual c
  JOIN hijos h ON c.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  WHERE c.anio = v_anio 
    AND c.mes = v_mes
    AND (c.porcentaje_asistencia < 85 OR NOT c.cumple_80_porciento)
  ORDER BY c.porcentaje_asistencia ASC, h.nombre;
END;
$$;

-- Función para calcular asistencia del mes actual de un hijo
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
  
  -- Calcular asistencia
  SELECT * INTO v_calculo
  FROM calcular_asistencia_mensual_hijo(p_hijo_id, v_anio, v_mes);
  
  -- Retornar como JSON
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
    'mensaje', CASE 
      WHEN v_calculo.es_hijo_personal THEN 'Hijo de personal - Exento del control'
      WHEN v_calculo.porcentaje_asistencia >= 80 THEN 'Cumple con el 80% de asistencia'
      WHEN v_calculo.porcentaje_asistencia >= 70 THEN 'ALERTA: Por debajo del 80%'
      ELSE 'CRÍTICO: Muy por debajo del 80%'
    END
  );
END;
$$;

-- Comentarios
COMMENT ON FUNCTION obtener_historial_asistencia_hijo IS 
  'Obtiene el historial de asistencia de un hijo. Accesible por padres y administradores.';

COMMENT ON FUNCTION obtener_resumen_control_mes IS 
  'Obtiene el resumen completo del control de asistencia de un mes. Solo administradores.';

COMMENT ON FUNCTION obtener_alertas_asistencia_baja IS 
  'Lista hijos con asistencia baja o en riesgo de perder el descuento. Solo administradores.';

COMMENT ON FUNCTION obtener_asistencia_mes_actual_hijo IS 
  'Calcula la asistencia del mes actual de un hijo en tiempo real. Padres y administradores.';