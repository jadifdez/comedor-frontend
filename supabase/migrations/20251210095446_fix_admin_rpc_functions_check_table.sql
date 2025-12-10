/*
  # Fix admin RPC functions to check administradores table

  1. Changes
    - Update admin_load_all_grados to check administradores table instead of hardcoded emails
    - Update admin_update_grado_activo to check administradores table
    - Update admin_update_grado_menu_option to check administradores table
  
  2. Security
    - Maintains SECURITY DEFINER for elevated privileges
    - Checks if authenticated user exists in administradores table with activo=true
    - More flexible and maintainable than hardcoded emails
*/

-- Function to check if current user is an active admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user email exists in administradores table and is active
  SELECT EXISTS (
    SELECT 1
    FROM administradores
    WHERE email = auth.email()
    AND activo = true
  ) INTO admin_exists;

  RETURN admin_exists;
END;
$$;

-- Update admin_load_all_grados to use the new is_admin function
CREATE OR REPLACE FUNCTION admin_load_all_grados()
RETURNS TABLE (
  id uuid,
  nombre text,
  orden integer,
  activo boolean,
  created_at timestamptz,
  tiene_opcion_menu boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all grados regardless of RLS policies
  RETURN QUERY
  SELECT g.id, g.nombre, g.orden, g.activo, g.created_at, g.tiene_opcion_menu
  FROM grados g
  ORDER BY g.orden;
END;
$$;

-- Update admin_update_grado_activo to use the new is_admin function
CREATE OR REPLACE FUNCTION admin_update_grado_activo(grado_id uuid, new_activo boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update grado activo status
  UPDATE grados
  SET activo = new_activo
  WHERE id = grado_id;
END;
$$;

-- Update admin_update_grado_menu_option to use the new is_admin function
CREATE OR REPLACE FUNCTION admin_update_grado_menu_option(grado_id uuid, new_tiene_opcion_menu boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update grado menu option
  UPDATE grados
  SET tiene_opcion_menu = new_tiene_opcion_menu
  WHERE id = grado_id;
END;
$$;
