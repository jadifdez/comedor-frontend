/*
  # Sistema de Control de Asistencia del 80% - Parte 2: Tabla de Historial

  ## Nueva Tabla: comedor_control_asistencia_mensual

  Esta tabla almacena el historial mensual de asistencia de cada hijo inscrito en el comedor.
  Registra el cálculo detallado de asistencia realizado al final de cada mes.

  ## Estructura de la Tabla

  ### Campos Principales
  - `id` (uuid) - Identificador único del registro
  - `hijo_id` (uuid) - Referencia al hijo
  - `anio` (integer) - Año del periodo evaluado
  - `mes` (integer) - Mes del periodo evaluado (1-12)
  - `periodo` (text) - Formato YYYY-MM para facilitar consultas

  ### Datos de Cálculo
  - `total_dias_laborables` (integer) - Total de días laborables del mes
  - `dias_inscrito` (integer) - Días en los que el hijo estaba inscrito
  - `dias_festivos` (integer) - Días festivos en el periodo
  - `dias_baja` (integer) - Días dados de baja
  - `dias_invitacion` (integer) - Días con invitación (no cuentan como falta)
  - `dias_asistidos` (integer) - Días efectivos de asistencia
  - `dias_faltados` (integer) - Días en que faltó sin justificación
  - `porcentaje_asistencia` (numeric) - Porcentaje calculado (0-100)

  ### Control de Descuento
  - `cumple_80_porciento` (boolean) - Si cumple o no el mínimo del 80%
  - `es_hijo_personal` (boolean) - Si es hijo de personal (exento de control)
  - `precio_antes` (numeric) - Precio diario antes del control
  - `precio_despues` (numeric) - Precio diario después del control
  - `descuento_aplicado` (boolean) - Si se mantuvo el descuento
  - `observaciones` (text) - Notas adicionales sobre el cálculo

  ### Metadatos
  - `procesado_en` (timestamptz) - Momento en que se procesó el control
  - `procesado_por` (text) - Email del administrador que ejecutó el proceso
  - `created_at` (timestamptz) - Fecha de creación del registro

  ## Seguridad (RLS)
  - Padres pueden ver solo los registros de sus hijos
  - Administradores pueden ver y gestionar todos los registros

  ## Índices
  Se crean índices para optimizar:
  - Consultas por hijo
  - Consultas por periodo
  - Consultas combinadas hijo-periodo
  - Filtrado por cumplimiento del 80%
*/

-- Crear tabla de control de asistencia mensual
CREATE TABLE IF NOT EXISTS comedor_control_asistencia_mensual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo_id uuid NOT NULL REFERENCES hijos(id) ON DELETE CASCADE,
  anio integer NOT NULL CHECK (anio >= 2024 AND anio <= 2100),
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  periodo text NOT NULL,
  
  -- Datos de cálculo
  total_dias_laborables integer NOT NULL DEFAULT 0,
  dias_inscrito integer NOT NULL DEFAULT 0,
  dias_festivos integer NOT NULL DEFAULT 0,
  dias_baja integer NOT NULL DEFAULT 0,
  dias_invitacion integer NOT NULL DEFAULT 0,
  dias_asistidos integer NOT NULL DEFAULT 0,
  dias_faltados integer NOT NULL DEFAULT 0,
  porcentaje_asistencia numeric(5,2) NOT NULL DEFAULT 0,
  
  -- Control de descuento
  cumple_80_porciento boolean NOT NULL DEFAULT false,
  es_hijo_personal boolean NOT NULL DEFAULT false,
  precio_antes numeric(10,2),
  precio_despues numeric(10,2),
  descuento_aplicado boolean NOT NULL DEFAULT true,
  observaciones text,
  
  -- Metadatos
  procesado_en timestamptz NOT NULL DEFAULT now(),
  procesado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint para evitar duplicados (un registro por hijo por mes)
  CONSTRAINT unique_hijo_periodo UNIQUE (hijo_id, anio, mes)
);

-- Habilitar RLS
ALTER TABLE comedor_control_asistencia_mensual ENABLE ROW LEVEL SECURITY;

-- Política para que padres vean el historial de sus hijos
CREATE POLICY "Padres pueden ver historial de asistencia de sus hijos"
  ON comedor_control_asistencia_mensual
  FOR SELECT
  TO authenticated
  USING (
    hijo_id IN (
      SELECT h.id
      FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    )
  );

-- Política para que administradores vean todos los registros
CREATE POLICY "Administradores pueden ver todo el historial"
  ON comedor_control_asistencia_mensual
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Política para que administradores inserten registros
CREATE POLICY "Administradores pueden crear registros de control"
  ON comedor_control_asistencia_mensual
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Política para que administradores actualicen registros
CREATE POLICY "Administradores pueden actualizar registros de control"
  ON comedor_control_asistencia_mensual
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Política para que administradores eliminen registros
CREATE POLICY "Administradores pueden eliminar registros de control"
  ON comedor_control_asistencia_mensual
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_control_asistencia_hijo_id 
  ON comedor_control_asistencia_mensual(hijo_id);

CREATE INDEX IF NOT EXISTS idx_control_asistencia_periodo 
  ON comedor_control_asistencia_mensual(periodo);

CREATE INDEX IF NOT EXISTS idx_control_asistencia_anio_mes 
  ON comedor_control_asistencia_mensual(anio, mes);

CREATE INDEX IF NOT EXISTS idx_control_asistencia_hijo_periodo 
  ON comedor_control_asistencia_mensual(hijo_id, periodo);

CREATE INDEX IF NOT EXISTS idx_control_asistencia_cumplimiento 
  ON comedor_control_asistencia_mensual(cumple_80_porciento) 
  WHERE cumple_80_porciento = false;

CREATE INDEX IF NOT EXISTS idx_control_asistencia_procesado 
  ON comedor_control_asistencia_mensual(procesado_en DESC);

-- Comentarios para documentación
COMMENT ON TABLE comedor_control_asistencia_mensual IS 
  'Historial mensual de asistencia y control del 80% para cada hijo inscrito en el comedor';

COMMENT ON COLUMN comedor_control_asistencia_mensual.periodo IS 
  'Formato YYYY-MM para facilitar búsquedas por periodo';

COMMENT ON COLUMN comedor_control_asistencia_mensual.dias_asistidos IS 
  'Días efectivos de asistencia: dias_inscrito - dias_baja - dias_invitacion';

COMMENT ON COLUMN comedor_control_asistencia_mensual.porcentaje_asistencia IS 
  'Porcentaje calculado: (dias_asistidos / dias_inscrito) * 100';

COMMENT ON COLUMN comedor_control_asistencia_mensual.cumple_80_porciento IS 
  'Indica si el alumno cumplió con el mínimo del 80% de asistencia';

COMMENT ON COLUMN comedor_control_asistencia_mensual.es_hijo_personal IS 
  'Los hijos de personal están exentos del control del 80%';