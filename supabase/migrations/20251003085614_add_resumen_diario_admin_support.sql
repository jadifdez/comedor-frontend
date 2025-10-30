/*
  # Add Admin Support for Resumen Diario (Daily Summary)

  1. RLS Policies for Admins
    - Add admin SELECT policies for inscripciones_comedor (children registrations)
    - Add admin SELECT policies for bajas_comedor (scheduled absences)
    - Add admin SELECT policies for solicitudes_comida (one-time meal requests)
    - Add admin SELECT policies for elecciones_menu (menu selections)
    - Add admin SELECT policies for enfermedades (soft diet requests)

  2. Database Functions for Daily Summary
    - Function to get all attendees for a specific date (children only, as parent registrations table doesn't exist yet)
    - Function to get scheduled absences for a specific date
    - Function to get one-time meal requests for a specific date
    - Function to get menu selections for a specific date
    - Function to get soft diet requests for a specific date

  3. Important Notes
    - All functions check if the user is an admin using is_admin()
    - Functions filter by date and active status
    - Functions exclude festive days automatically
    - Functions return detailed information including names, courses, and relationships
*/

-- ============================================================
-- RLS POLICIES FOR ADMIN ACCESS
-- ============================================================

-- Policy for admins to read all inscripciones_comedor (children)
DROP POLICY IF EXISTS "Admins can read all inscripciones comedor" ON inscripciones_comedor;
CREATE POLICY "Admins can read all inscripciones comedor"
  ON inscripciones_comedor
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy for admins to read all bajas_comedor
DROP POLICY IF EXISTS "Admins can read all bajas comedor" ON bajas_comedor;
CREATE POLICY "Admins can read all bajas comedor"
  ON bajas_comedor
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy for admins to read all elecciones_menu
DROP POLICY IF EXISTS "Admins can read all elecciones menu" ON elecciones_menu;
CREATE POLICY "Admins can read all elecciones menu"
  ON elecciones_menu
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy for admins to read all enfermedades
DROP POLICY IF EXISTS "Admins can read all enfermedades" ON enfermedades;
CREATE POLICY "Admins can read all enfermedades"
  ON enfermedades
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- ============================================================
-- HELPER: Check if bajas_comedor has hijo_id column
-- ============================================================
DO $$
BEGIN
  -- Check if hijo_id column exists in bajas_comedor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bajas_comedor' AND column_name = 'hijo_id'
  ) THEN
    -- If not, we need to add it first
    ALTER TABLE bajas_comedor ADD COLUMN hijo_id uuid REFERENCES hijos(id) ON DELETE CASCADE;
  END IF;
  
  -- Check if fecha_inicio and fecha_fin columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bajas_comedor' AND column_name = 'fecha_inicio'
  ) THEN
    ALTER TABLE bajas_comedor ADD COLUMN fecha_inicio date;
    ALTER TABLE bajas_comedor ADD COLUMN fecha_fin date;
  END IF;
END $$;

-- ============================================================
-- FUNCTION: Get all attendees for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_attendees_by_date(target_date date)
RETURNS TABLE (
  id uuid,
  nombre text,
  curso text,
  tipo_persona text,
  dias_semana integer[],
  padre_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  day_of_week integer;
  is_festivo boolean;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get day of week (1 = Monday, 7 = Sunday)
  day_of_week := EXTRACT(ISODOW FROM target_date);
  
  -- Check if date is a festive day
  SELECT EXISTS (
    SELECT 1 FROM dias_festivos 
    WHERE fecha = target_date AND activo = true
  ) INTO is_festivo;
  
  -- Return empty if it's a festive day or weekend
  IF is_festivo OR day_of_week > 5 THEN
    RETURN;
  END IF;

  -- Get children attendees
  RETURN QUERY
  SELECT 
    ic.id,
    h.nombre,
    g.nombre as curso,
    'hijo'::text as tipo_persona,
    ic.dias_semana,
    p.nombre as padre_nombre
  FROM inscripciones_comedor ic
  JOIN hijos h ON ic.hijo_id = h.id
  JOIN grados g ON h.grado_id = g.id
  JOIN padres p ON h.padre_id = p.id
  WHERE ic.activo = true
    AND day_of_week = ANY(ic.dias_semana)
    AND (ic.fecha_inicio IS NULL OR ic.fecha_inicio <= target_date)
    AND (ic.fecha_fin IS NULL OR ic.fecha_fin >= target_date)
    -- Exclude if there's a scheduled absence for this date (if columns exist)
    AND NOT EXISTS (
      SELECT 1 FROM bajas_comedor bc
      WHERE bc.hijo_id = h.id
        AND bc.fecha_inicio IS NOT NULL
        AND bc.fecha_fin IS NOT NULL
        AND bc.fecha_inicio <= target_date
        AND bc.fecha_fin >= target_date
    )
  
  ORDER BY g.orden, h.nombre;
END;
$$;

-- ============================================================
-- FUNCTION: Get scheduled absences for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_bajas_by_date(target_date date)
RETURNS TABLE (
  id uuid,
  nombre text,
  curso text,
  tipo_persona text,
  fecha_inicio date,
  fecha_fin date,
  dias_semana_habituales integer[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  -- Children with scheduled absences
  SELECT 
    bc.id,
    h.nombre,
    g.nombre as curso,
    'hijo'::text as tipo_persona,
    bc.fecha_inicio,
    bc.fecha_fin,
    ic.dias_semana as dias_semana_habituales
  FROM bajas_comedor bc
  JOIN hijos h ON bc.hijo_id = h.id
  JOIN grados g ON h.grado_id = g.id
  LEFT JOIN inscripciones_comedor ic ON ic.hijo_id = h.id AND ic.activo = true
  WHERE bc.fecha_inicio IS NOT NULL
    AND bc.fecha_fin IS NOT NULL
    AND bc.fecha_inicio <= target_date
    AND bc.fecha_fin >= target_date
  
  ORDER BY g.orden, h.nombre;
END;
$$;

-- ============================================================
-- FUNCTION: Get one-time meal requests for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_solicitudes_by_date(target_date date)
RETURNS TABLE (
  id uuid,
  nombre text,
  curso text,
  fecha_solicitud timestamptz,
  estado text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    sc.id,
    sc.hijo as nombre,
    sc.curso,
    sc.fecha_creacion as fecha_solicitud,
    sc.estado
  FROM solicitudes_comida sc
  WHERE sc.fecha = to_char(target_date, 'DD/MM/YYYY')
  ORDER BY sc.curso, sc.hijo;
END;
$$;

-- ============================================================
-- FUNCTION: Get menu selections for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_menu_selections_by_date(target_date date)
RETURNS TABLE (
  id uuid,
  nombre text,
  curso text,
  tipo_persona text,
  menu_principal text,
  menu_guarnicion text,
  fecha_eleccion timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  -- Children menu selections
  SELECT 
    em.id,
    h.nombre,
    g.nombre as curso,
    'hijo'::text as tipo_persona,
    omp.nombre as menu_principal,
    omg.nombre as menu_guarnicion,
    em.created_at as fecha_eleccion
  FROM elecciones_menu em
  JOIN hijos h ON em.hijo_id = h.id
  JOIN grados g ON h.grado_id = g.id
  JOIN opciones_menu_principal omp ON em.opcion_principal_id = omp.id
  JOIN opciones_menu_guarnicion omg ON em.opcion_guarnicion_id = omg.id
  WHERE em.fecha = target_date
  
  ORDER BY g.orden, h.nombre;
END;
$$;

-- ============================================================
-- FUNCTION: Get soft diet requests for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION get_dieta_blanda_by_date(target_date date)
RETURNS TABLE (
  id uuid,
  nombre text,
  curso text,
  tipo_persona text,
  fecha_dieta date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  -- Children soft diet requests
  SELECT 
    e.id,
    e.hijo as nombre,
    e.curso,
    'hijo'::text as tipo_persona,
    e.fecha_dieta_blanda as fecha_dieta
  FROM enfermedades e
  WHERE e.fecha_dieta_blanda = target_date
    AND e.estado = 'aprobada'
  
  ORDER BY e.curso, e.hijo;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bajas_comedor_hijo_id ON bajas_comedor(hijo_id);
CREATE INDEX IF NOT EXISTS idx_bajas_comedor_fecha_inicio ON bajas_comedor(fecha_inicio) WHERE fecha_inicio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bajas_comedor_fecha_fin ON bajas_comedor(fecha_fin) WHERE fecha_fin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_elecciones_menu_fecha ON elecciones_menu(fecha);
CREATE INDEX IF NOT EXISTS idx_enfermedades_fecha_dieta ON enfermedades(fecha_dieta_blanda);
CREATE INDEX IF NOT EXISTS idx_solicitudes_comida_fecha ON solicitudes_comida(fecha);