/*
  # Admin RPC Functions for Menu Management
  
  1. New Functions
    - `admin_load_all_opciones_principales()` - Load all main dish options (active and inactive)
    - `admin_load_all_opciones_guarnicion()` - Load all side dish options (active and inactive)
    - `admin_insert_opcion_principal()` - Insert new main dish option
    - `admin_insert_opcion_guarnicion()` - Insert new side dish option
    - `admin_update_opcion_principal()` - Update main dish option
    - `admin_update_opcion_guarnicion()` - Update side dish option
    - `admin_update_opcion_principal_activo()` - Toggle main dish active status
    - `admin_update_opcion_guarnicion_activo()` - Toggle side dish active status
    - `admin_delete_opcion_principal()` - Delete main dish option
    - `admin_delete_opcion_guarnicion()` - Delete side dish option
    
  2. Security
    - All functions use SECURITY DEFINER to bypass RLS
    - Admin verification using auth.email()
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all main dish options (active and inactive)
  RETURN QUERY
  SELECT 
    o.id,
    o.dia_semana,
    o.nombre,
    o.activo,
    o.orden,
    o.created_at
  FROM opciones_menu_principal o
  ORDER BY o.dia_semana, o.orden;
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all side dish options (active and inactive)
  RETURN QUERY
  SELECT 
    o.id,
    o.nombre,
    o.activo,
    o.orden,
    o.created_at
  FROM opciones_menu_guarnicion o
  ORDER BY o.orden;
END;
$$;

-- Function to insert new main dish option
CREATE OR REPLACE FUNCTION admin_insert_opcion_principal(
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean DEFAULT true
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Insert new main dish option
  INSERT INTO opciones_menu_principal (nombre, dia_semana, orden, activo)
  VALUES (new_nombre, new_dia_semana, new_orden, new_activo)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function to insert new side dish option
CREATE OR REPLACE FUNCTION admin_insert_opcion_guarnicion(
  new_nombre text,
  new_orden integer,
  new_activo boolean DEFAULT true
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Insert new side dish option
  INSERT INTO opciones_menu_guarnicion (nombre, orden, activo)
  VALUES (new_nombre, new_orden, new_activo)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function to update main dish option
CREATE OR REPLACE FUNCTION admin_update_opcion_principal(
  opcion_id uuid,
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update main dish option
  UPDATE opciones_menu_principal 
  SET 
    nombre = new_nombre,
    dia_semana = new_dia_semana,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update side dish option
CREATE OR REPLACE FUNCTION admin_update_opcion_guarnicion(
  opcion_id uuid,
  new_nombre text,
  new_orden integer,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update side dish option
  UPDATE opciones_menu_guarnicion 
  SET 
    nombre = new_nombre,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update main dish active status
CREATE OR REPLACE FUNCTION admin_update_opcion_principal_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update active status
  UPDATE opciones_menu_principal 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update side dish active status
CREATE OR REPLACE FUNCTION admin_update_opcion_guarnicion_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update active status
  UPDATE opciones_menu_guarnicion 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to delete main dish option
CREATE OR REPLACE FUNCTION admin_delete_opcion_principal(
  opcion_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Delete main dish option
  DELETE FROM opciones_menu_principal 
  WHERE id = opcion_id;
END;
$$;

-- Function to delete side dish option
CREATE OR REPLACE FUNCTION admin_delete_opcion_guarnicion(
  opcion_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Delete side dish option
  DELETE FROM opciones_menu_guarnicion 
  WHERE id = opcion_id;
END;
$$;