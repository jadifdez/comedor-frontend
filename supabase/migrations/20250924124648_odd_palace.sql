/*
  # Create admin RPC functions for menu options management

  1. New Functions
    - `admin_load_all_opciones_principales` - Load all main dish options (active and inactive)
    - `admin_load_all_opciones_guarnicion` - Load all side dish options (active and inactive)
    - `admin_update_opcion_principal_activo` - Update active status of main dish option
    - `admin_update_opcion_guarnicion_activo` - Update active status of side dish option

  2. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - Admin verification using auth.email() function
    - Only admin users can execute these functions
*/

-- Function to load all main dish options (bypassing RLS)
CREATE OR REPLACE FUNCTION admin_load_all_opciones_principales()
RETURNS TABLE (
  id uuid,
  dia_semana integer,
  nombre text,
  activo boolean,
  orden integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin access
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all main dish options (active and inactive)
  RETURN QUERY
  SELECT 
    omp.id,
    omp.dia_semana,
    omp.nombre,
    omp.activo,
    omp.orden,
    omp.created_at
  FROM opciones_menu_principal omp
  ORDER BY omp.dia_semana, omp.orden;
END;
$$;

-- Function to load all side dish options (bypassing RLS)
CREATE OR REPLACE FUNCTION admin_load_all_opciones_guarnicion()
RETURNS TABLE (
  id uuid,
  nombre text,
  activo boolean,
  orden integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin access
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all side dish options (active and inactive)
  RETURN QUERY
  SELECT 
    omg.id,
    omg.nombre,
    omg.activo,
    omg.orden,
    omg.created_at
  FROM opciones_menu_guarnicion omg
  ORDER BY omg.orden;
END;
$$;

-- Function to update main dish option active status
CREATE OR REPLACE FUNCTION admin_update_opcion_principal_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin access
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the main dish option
  UPDATE opciones_menu_principal 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update side dish option active status
CREATE OR REPLACE FUNCTION admin_update_opcion_guarnicion_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin access
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the side dish option
  UPDATE opciones_menu_guarnicion 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;