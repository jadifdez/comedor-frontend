/*
  # Sistema de inscripción al comedor por días

  1. Nueva tabla
    - `inscripciones_comedor`
      - `id` (uuid, primary key)
      - `hijo_id` (uuid, foreign key to hijos)
      - `dias_semana` (integer array) - Array con los días: 1=Lunes, 2=Martes, etc.
      - `precio_diario` (decimal) - Precio por día según la cantidad de días
      - `activo` (boolean) - Si la inscripción está activa
      - `fecha_inicio` (date) - Desde cuándo está inscrito
      - `fecha_fin` (date) - Hasta cuándo (nullable para inscripciones indefinidas)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Función para calcular precio
    - Función que calcula el precio según los días de la semana

  3. Seguridad
    - RLS habilitado
    - Políticas para padres y administradores
*/

-- Crear tabla de inscripciones al comedor
CREATE TABLE IF NOT EXISTS inscripciones_comedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo_id uuid NOT NULL REFERENCES hijos(id) ON DELETE CASCADE,
  dias_semana integer[] NOT NULL CHECK (
    array_length(dias_semana, 1) > 0 AND
    array_length(dias_semana, 1) <= 5 AND
    NOT (dias_semana && ARRAY[0, 6, 7]) -- No permitir domingos (0), sábados (6) o valores inválidos (7+)
  ),
  precio_diario decimal(5,2) NOT NULL,
  activo boolean DEFAULT true,
  fecha_inicio date DEFAULT CURRENT_DATE,
  fecha_fin date DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint para asegurar que no hay duplicados activos para el mismo hijo
  CONSTRAINT unique_active_inscription_per_hijo 
    EXCLUDE (hijo_id WITH =) 
    WHERE (activo = true)
);

-- Función para calcular precio diario según cantidad de días
CREATE OR REPLACE FUNCTION calcular_precio_diario(dias_count integer)
RETURNS decimal(5,2)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si come 1, 2 o 3 días: 9,15€ por día
  IF dias_count >= 1 AND dias_count <= 3 THEN
    RETURN 9.15;
  -- Si come 4 o 5 días: 7,50€ por día
  ELSIF dias_count >= 4 AND dias_count <= 5 THEN
    RETURN 7.50;
  ELSE
    -- Valor por defecto (no debería llegar aquí por el constraint)
    RETURN 9.15;
  END IF;
END;
$$;

-- Función trigger para actualizar precio automáticamente
CREATE OR REPLACE FUNCTION update_precio_diario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.precio_diario := calcular_precio_diario(array_length(NEW.dias_semana, 1));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger para actualizar precio automáticamente
CREATE TRIGGER trigger_update_precio_diario
  BEFORE INSERT OR UPDATE ON inscripciones_comedor
  FOR EACH ROW
  EXECUTE FUNCTION update_precio_diario();

-- Trigger para updated_at
CREATE TRIGGER update_inscripciones_comedor_updated_at
  BEFORE UPDATE ON inscripciones_comedor
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE inscripciones_comedor ENABLE ROW LEVEL SECURITY;

-- Política para que los padres puedan gestionar las inscripciones de sus hijos
CREATE POLICY "Parents can manage inscriptions for their children"
  ON inscripciones_comedor
  FOR ALL
  TO authenticated
  USING (
    hijo_id IN (
      SELECT h.id
      FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    )
  )
  WITH CHECK (
    hijo_id IN (
      SELECT h.id
      FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    )
  );

-- Política para administradores
CREATE POLICY "Admins can manage all inscriptions"
  ON inscripciones_comedor
  FOR ALL
  TO authenticated
  USING (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  );

-- Función RPC para administradores cargar todas las inscripciones
CREATE OR REPLACE FUNCTION admin_load_all_inscripciones()
RETURNS TABLE (
  id uuid,
  hijo_id uuid,
  dias_semana integer[],
  precio_diario decimal(5,2),
  activo boolean,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar que el usuario es administrador
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.hijo_id,
    i.dias_semana,
    i.precio_diario,
    i.activo,
    i.fecha_inicio,
    i.fecha_fin,
    i.created_at,
    i.updated_at
  FROM inscripciones_comedor i
  ORDER BY i.created_at DESC;
END;
$$;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_inscripciones_comedor_hijo_id ON inscripciones_comedor(hijo_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_comedor_activo ON inscripciones_comedor(activo);
CREATE INDEX IF NOT EXISTS idx_inscripciones_comedor_fechas ON inscripciones_comedor(fecha_inicio, fecha_fin);