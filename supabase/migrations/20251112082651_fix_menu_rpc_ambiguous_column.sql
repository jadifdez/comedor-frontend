/*
  # Fix ambiguous column reference in menu RPC functions
  
  1. Adds table aliases to avoid ambiguous column references
  2. Qualifies all column names with table aliases
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS admin_load_all_opciones_principales();
DROP FUNCTION IF EXISTS admin_load_all_opciones_guarnicion();
DROP FUNCTION IF EXISTS admin_update_opcion_principal_activo(uuid, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_guarnicion_activo(uuid, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_principal(uuid, text, integer, integer, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_guarnicion(uuid, text, integer, boolean);
DROP FUNCTION IF EXISTS admin_insert_opcion_principal(text, integer, integer, boolean);
DROP FUNCTION IF EXISTS admin_insert_opcion_guarnicion(text, integer, boolean);
DROP FUNCTION IF EXISTS admin_delete_opcion_principal(uuid);
DROP FUNCTION IF EXISTS admin_delete_opcion_guarnicion(uuid);

-- Function to load all opciones principales (bypassing RLS)
CREATE FUNCTION admin_load_all_opciones_principales()
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
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all opciones principales (active and inactive)
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

-- Function to load all opciones guarnicion (bypassing RLS)
CREATE FUNCTION admin_load_all_opciones_guarnicion()
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
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all opciones guarnicion (active and inactive)
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

-- Function to update opcion principal activo status (bypassing RLS)
CREATE FUNCTION admin_update_opcion_principal_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the opcion principal
  UPDATE opciones_menu_principal 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update opcion guarnicion activo status (bypassing RLS)
CREATE FUNCTION admin_update_opcion_guarnicion_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the opcion guarnicion
  UPDATE opciones_menu_guarnicion 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update opcion principal (bypassing RLS)
CREATE FUNCTION admin_update_opcion_principal(
  opcion_id uuid,
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the opcion principal
  UPDATE opciones_menu_principal 
  SET 
    nombre = new_nombre,
    dia_semana = new_dia_semana,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to update opcion guarnicion (bypassing RLS)
CREATE FUNCTION admin_update_opcion_guarnicion(
  opcion_id uuid,
  new_nombre text,
  new_orden integer,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the opcion guarnicion
  UPDATE opciones_menu_guarnicion 
  SET 
    nombre = new_nombre,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Function to insert opcion principal (bypassing RLS)
CREATE FUNCTION admin_insert_opcion_principal(
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Insert the new opcion principal
  INSERT INTO opciones_menu_principal (nombre, dia_semana, orden, activo)
  VALUES (new_nombre, new_dia_semana, new_orden, new_activo);
END;
$$;

-- Function to insert opcion guarnicion (bypassing RLS)
CREATE FUNCTION admin_insert_opcion_guarnicion(
  new_nombre text,
  new_orden integer,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Insert the new opcion guarnicion
  INSERT INTO opciones_menu_guarnicion (nombre, orden, activo)
  VALUES (new_nombre, new_orden, new_activo);
END;
$$;

-- Function to delete opcion principal (bypassing RLS)
CREATE FUNCTION admin_delete_opcion_principal(
  opcion_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Delete the opcion principal
  DELETE FROM opciones_menu_principal WHERE id = opcion_id;
END;
$$;

-- Function to delete opcion guarnicion (bypassing RLS)
CREATE FUNCTION admin_delete_opcion_guarnicion(
  opcion_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin in administradores table
  IF NOT EXISTS (
    SELECT 1 FROM administradores a
    WHERE a.email = auth.email() 
    AND a.activo = true
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Delete the opcion guarnicion
  DELETE FROM opciones_menu_guarnicion WHERE id = opcion_id;
END;
$$;