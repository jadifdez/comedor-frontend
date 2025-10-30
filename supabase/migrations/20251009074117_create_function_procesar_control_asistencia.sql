/*
  # Sistema de Control de Asistencia del 80% - Parte 3: Funciones de Procesamiento

  ## Funciones Principales

  ### 1. calcular_asistencia_mensual_hijo
  Calcula el porcentaje de asistencia de un hijo específico en un mes dado.
  
  **Parámetros:**
  - p_hijo_id: UUID del hijo
  - p_anio: Año del periodo
  - p_mes: Mes del periodo (1-12)
  
  **Retorna:** Registro con todos los datos calculados
  
  **Lógica de Cálculo:**
  1. Obtiene la inscripción activa del hijo
  2. Identifica los días laborables del mes
  3. Filtra solo los días que el hijo tiene inscripción según dias_semana
  4. Resta días festivos del mes
  5. Resta días con baja registrada
  6. Resta días con invitación
  7. Calcula porcentaje: (días asistidos / días inscritos) * 100
  
  ### 2. procesar_control_asistencia_mensual
  Procesa el control del 80% para todos los hijos o un hijo específico.
  
  **Parámetros:**
  - p_anio: Año a procesar
  - p_mes: Mes a procesar
  - p_hijo_id: (Opcional) ID de hijo específico, null para procesar todos
  
  **Retorna:** JSON con resumen del procesamiento
  
  **Acciones:**
  1. Calcula asistencia de cada hijo
  2. Verifica si cumple el 80%
  3. Excluye hijos de personal
  4. Aplica penalización (precio 9.15€) si no cumple
  5. Recupera descuento si vuelve a cumplir
  6. Registra todo en la tabla de control
  
  ## Reglas de Negocio Implementadas
  
  - **Hijos de Personal**: Completamente exentos, nunca pierden descuento
  - **Cálculo Mensual**: Cada mes es independiente
  - **Precio Penalizado**: 9.15€ por día para todo el mes siguiente
  - **Recuperación**: Automática al cumplir 80% nuevamente
  - **Días Excluidos**: Festivos, bajas e invitaciones no cuentan como faltas
  - **Rango de Inscripción**: Solo cuenta días entre fecha_inicio y fecha_fin
*/

-- Función para calcular asistencia mensual de un hijo
CREATE OR REPLACE FUNCTION calcular_asistencia_mensual_hijo(
  p_hijo_id uuid,
  p_anio integer,
  p_mes integer
)
RETURNS TABLE (
  hijo_id uuid,
  anio integer,
  mes integer,
  periodo text,
  total_dias_laborables integer,
  dias_inscrito integer,
  dias_festivos integer,
  dias_baja integer,
  dias_invitacion integer,
  dias_asistidos integer,
  dias_faltados integer,
  porcentaje_asistencia numeric,
  cumple_80_porciento boolean,
  es_hijo_personal boolean,
  precio_actual numeric,
  inscripcion_activa_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inscripcion record;
  v_es_personal boolean;
  v_fecha_inicio date;
  v_fecha_fin date;
  v_primer_dia_mes date;
  v_ultimo_dia_mes date;
  v_dias_inscritos integer := 0;
  v_dias_bajas integer := 0;
  v_dias_invitaciones integer := 0;
  v_dias_festivos integer := 0;
  v_dias_asistidos integer := 0;
  v_porcentaje numeric := 0;
  v_cumple boolean := false;
  v_fecha_actual date;
  v_dia_semana integer;
BEGIN
  -- Construir fechas del mes
  v_primer_dia_mes := make_date(p_anio, p_mes, 1);
  v_ultimo_dia_mes := (v_primer_dia_mes + interval '1 month' - interval '1 day')::date;
  
  -- Obtener inscripción activa del hijo
  SELECT i.*, i.id as insc_id
  INTO v_inscripcion
  FROM comedor_inscripciones i
  WHERE i.hijo_id = p_hijo_id
    AND i.activo = true
    AND i.fecha_inicio <= v_ultimo_dia_mes
    AND (i.fecha_fin IS NULL OR i.fecha_fin >= v_primer_dia_mes)
  LIMIT 1;
  
  -- Si no hay inscripción activa, retornar datos vacíos
  IF v_inscripcion.id IS NULL THEN
    RETURN QUERY SELECT 
      p_hijo_id, p_anio, p_mes,
      p_anio::text || '-' || lpad(p_mes::text, 2, '0'),
      0, 0, 0, 0, 0, 0, 0, 0::numeric, false, false, 0::numeric, NULL::uuid;
    RETURN;
  END IF;
  
  -- Verificar si es hijo de personal
  SELECT COALESCE(p.es_personal, false)
  INTO v_es_personal
  FROM hijos h
  JOIN padres p ON h.padre_id = p.id
  WHERE h.id = p_hijo_id;
  
  -- Ajustar rango de fechas según inscripción
  v_fecha_inicio := GREATEST(v_inscripcion.fecha_inicio, v_primer_dia_mes);
  v_fecha_fin := LEAST(
    COALESCE(v_inscripcion.fecha_fin, v_ultimo_dia_mes),
    v_ultimo_dia_mes
  );
  
  -- Contar días festivos en el periodo
  SELECT COUNT(*)
  INTO v_dias_festivos
  FROM dias_festivos df
  WHERE df.activo = true
    AND df.fecha BETWEEN v_fecha_inicio AND v_fecha_fin;
  
  -- Iterar sobre cada día del mes para contar asistencias
  v_fecha_actual := v_fecha_inicio;
  WHILE v_fecha_actual <= v_fecha_fin LOOP
    v_dia_semana := EXTRACT(DOW FROM v_fecha_actual);
    
    -- Solo procesar días laborables (lunes=1 a viernes=5)
    IF v_dia_semana >= 1 AND v_dia_semana <= 5 THEN
      -- Verificar si NO es festivo
      IF NOT EXISTS (
        SELECT 1 FROM dias_festivos 
        WHERE fecha = v_fecha_actual AND activo = true
      ) THEN
        -- Verificar si el día está en los días de inscripción
        IF v_dia_semana = ANY(v_inscripcion.dias_semana) THEN
          v_dias_inscritos := v_dias_inscritos + 1;
          
          -- Verificar si tiene baja este día
          IF EXISTS (
            SELECT 1 FROM comedor_bajas
            WHERE hijo_id = p_hijo_id
              AND v_fecha_actual::text = ANY(dias)
          ) THEN
            v_dias_bajas := v_dias_bajas + 1;
          -- Verificar si tiene invitación este día
          ELSIF EXISTS (
            SELECT 1 FROM invitaciones_comedor
            WHERE hijo_id = p_hijo_id
              AND fecha = v_fecha_actual
          ) THEN
            v_dias_invitaciones := v_dias_invitaciones + 1;
          END IF;
        END IF;
      END IF;
    END IF;
    
    v_fecha_actual := v_fecha_actual + interval '1 day';
  END LOOP;
  
  -- Calcular días asistidos y porcentaje
  v_dias_asistidos := v_dias_inscritos - v_dias_bajas - v_dias_invitaciones;
  
  IF v_dias_inscritos > 0 THEN
    v_porcentaje := (v_dias_asistidos::numeric / v_dias_inscritos::numeric) * 100;
    v_cumple := v_porcentaje >= 80.00;
  ELSE
    v_porcentaje := 0;
    v_cumple := true; -- Si no hubo días inscritos, se considera que cumple
  END IF;
  
  -- Si es hijo de personal, siempre cumple
  IF v_es_personal THEN
    v_cumple := true;
  END IF;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    p_hijo_id,
    p_anio,
    p_mes,
    p_anio::text || '-' || lpad(p_mes::text, 2, '0'),
    v_dias_inscritos + v_dias_bajas + v_dias_invitaciones as total_laborables,
    v_dias_inscritos,
    v_dias_festivos,
    v_dias_bajas,
    v_dias_invitaciones,
    v_dias_asistidos,
    v_dias_inscritos - v_dias_asistidos as faltados,
    ROUND(v_porcentaje, 2),
    v_cumple,
    v_es_personal,
    v_inscripcion.precio_diario,
    v_inscripcion.id;
END;
$$;

-- Función principal para procesar control de asistencia
CREATE OR REPLACE FUNCTION procesar_control_asistencia_mensual(
  p_anio integer,
  p_mes integer,
  p_hijo_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hijo record;
  v_calculo record;
  v_precio_penalizado numeric := 9.15;
  v_total_procesados integer := 0;
  v_total_penalizados integer := 0;
  v_total_recuperados integer := 0;
  v_total_mantienen integer := 0;
  v_observaciones text;
  v_precio_anterior numeric;
  v_precio_nuevo numeric;
  v_aplicar_penalizacion boolean;
BEGIN
  -- Validar que el usuario sea administrador
  IF NOT EXISTS (
    SELECT 1 FROM administradores
    WHERE email = auth.email() AND activo = true
  ) THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;
  
  -- Validar parámetros
  IF p_anio < 2024 OR p_anio > 2100 THEN
    RAISE EXCEPTION 'Año inválido. Debe estar entre 2024 y 2100.';
  END IF;
  
  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mes inválido. Debe estar entre 1 y 12.';
  END IF;
  
  -- Iterar sobre hijos (uno específico o todos)
  FOR v_hijo IN
    SELECT h.id, h.nombre, h.padre_id
    FROM hijos h
    WHERE h.activo = true
      AND (p_hijo_id IS NULL OR h.id = p_hijo_id)
    ORDER BY h.nombre
  LOOP
    -- Calcular asistencia del hijo
    SELECT * INTO v_calculo
    FROM calcular_asistencia_mensual_hijo(v_hijo.id, p_anio, p_mes);
    
    -- Si no tiene inscripción activa, saltar
    IF v_calculo.inscripcion_activa_id IS NULL THEN
      CONTINUE;
    END IF;
    
    v_precio_anterior := v_calculo.precio_actual;
    v_precio_nuevo := v_calculo.precio_actual;
    v_aplicar_penalizacion := false;
    v_observaciones := '';
    
    -- Determinar acción según cumplimiento
    IF v_calculo.es_hijo_personal THEN
      v_observaciones := 'Hijo de personal - Exento de control del 80%';
    ELSIF NOT v_calculo.cumple_80_porciento THEN
      -- NO cumple el 80% - Aplicar penalización
      v_precio_nuevo := v_precio_penalizado;
      v_aplicar_penalizacion := true;
      v_total_penalizados := v_total_penalizados + 1;
      v_observaciones := format('No cumple 80%% (%s%%). Se aplica precio de penalización.', 
        ROUND(v_calculo.porcentaje_asistencia, 2));
      
      -- Actualizar inscripción con penalización
      UPDATE comedor_inscripciones
      SET 
        precio_diario = v_precio_penalizado,
        perdio_descuento_mes_anterior = true,
        mes_perdida_descuento = p_anio::text || '-' || lpad(p_mes::text, 2, '0'),
        precio_penalizado = v_precio_penalizado,
        updated_at = now()
      WHERE id = v_calculo.inscripcion_activa_id;
      
    ELSIF v_calculo.cumple_80_porciento THEN
      -- SÍ cumple el 80% - Verificar si recupera descuento
      SELECT perdio_descuento_mes_anterior
      INTO v_aplicar_penalizacion
      FROM comedor_inscripciones
      WHERE id = v_calculo.inscripcion_activa_id;
      
      IF v_aplicar_penalizacion THEN
        -- Recupera el descuento - Recalcular precio
        v_total_recuperados := v_total_recuperados + 1;
        v_observaciones := format('Recupera descuento. Cumple %s%% de asistencia.', 
          ROUND(v_calculo.porcentaje_asistencia, 2));
        
        -- Resetear penalización y recalcular precio
        UPDATE comedor_inscripciones
        SET 
          perdio_descuento_mes_anterior = false,
          mes_perdida_descuento = NULL,
          precio_penalizado = NULL,
          updated_at = now()
        WHERE id = v_calculo.inscripcion_activa_id;
        
        -- Obtener nuevo precio recalculado por los triggers existentes
        SELECT precio_diario INTO v_precio_nuevo
        FROM comedor_inscripciones
        WHERE id = v_calculo.inscripcion_activa_id;
        
      ELSE
        -- Mantiene su descuento actual
        v_total_mantienen := v_total_mantienen + 1;
        v_observaciones := format('Mantiene descuento. Cumple %s%% de asistencia.', 
          ROUND(v_calculo.porcentaje_asistencia, 2));
      END IF;
    END IF;
    
    -- Registrar en la tabla de control
    INSERT INTO comedor_control_asistencia_mensual (
      hijo_id, anio, mes, periodo,
      total_dias_laborables, dias_inscrito, dias_festivos,
      dias_baja, dias_invitacion, dias_asistidos, dias_faltados,
      porcentaje_asistencia, cumple_80_porciento, es_hijo_personal,
      precio_antes, precio_despues, descuento_aplicado,
      observaciones, procesado_por
    ) VALUES (
      v_calculo.hijo_id, v_calculo.anio, v_calculo.mes, v_calculo.periodo,
      v_calculo.total_dias_laborables, v_calculo.dias_inscrito, v_calculo.dias_festivos,
      v_calculo.dias_baja, v_calculo.dias_invitacion, v_calculo.dias_asistidos, 
      v_calculo.dias_faltados, v_calculo.porcentaje_asistencia, 
      v_calculo.cumple_80_porciento, v_calculo.es_hijo_personal,
      v_precio_anterior, v_precio_nuevo, NOT v_aplicar_penalizacion,
      v_observaciones, auth.email()
    )
    ON CONFLICT (hijo_id, anio, mes) 
    DO UPDATE SET
      total_dias_laborables = EXCLUDED.total_dias_laborables,
      dias_inscrito = EXCLUDED.dias_inscrito,
      dias_festivos = EXCLUDED.dias_festivos,
      dias_baja = EXCLUDED.dias_baja,
      dias_invitacion = EXCLUDED.dias_invitacion,
      dias_asistidos = EXCLUDED.dias_asistidos,
      dias_faltados = EXCLUDED.dias_faltados,
      porcentaje_asistencia = EXCLUDED.porcentaje_asistencia,
      cumple_80_porciento = EXCLUDED.cumple_80_porciento,
      es_hijo_personal = EXCLUDED.es_hijo_personal,
      precio_antes = EXCLUDED.precio_antes,
      precio_despues = EXCLUDED.precio_despues,
      descuento_aplicado = EXCLUDED.descuento_aplicado,
      observaciones = EXCLUDED.observaciones,
      procesado_en = now(),
      procesado_por = EXCLUDED.procesado_por;
    
    v_total_procesados := v_total_procesados + 1;
  END LOOP;
  
  -- Retornar resumen
  RETURN json_build_object(
    'success', true,
    'periodo', p_anio::text || '-' || lpad(p_mes::text, 2, '0'),
    'total_procesados', v_total_procesados,
    'total_penalizados', v_total_penalizados,
    'total_recuperados', v_total_recuperados,
    'total_mantienen_descuento', v_total_mantienen,
    'mensaje', format('Procesados %s hijos. Penalizados: %s, Recuperados: %s, Mantienen: %s',
      v_total_procesados, v_total_penalizados, v_total_recuperados, v_total_mantienen)
  );
END;
$$;

-- Comentarios
COMMENT ON FUNCTION calcular_asistencia_mensual_hijo IS 
  'Calcula el porcentaje de asistencia mensual de un hijo específico';

COMMENT ON FUNCTION procesar_control_asistencia_mensual IS 
  'Procesa el control del 80% de asistencia y aplica penalizaciones/recuperaciones';