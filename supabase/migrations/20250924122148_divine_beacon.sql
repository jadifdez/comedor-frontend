/*
  # Create admin functions for grados management

  1. New Functions
    - `admin_update_grado_activo` - Updates the activo status of a grado
    - `admin_update_grado_menu_option` - Updates the tiene_opcion_menu status of a grado
  
  2. Security
    - Functions run with SECURITY DEFINER (elevated privileges)
    - Include admin email checks within the functions
    - Bypass RLS by running with definer rights
*/

-- Function to update grado activo status
CREATE OR REPLACE FUNCTION admin_update_grado_activo(grado_id uuid, new_activo boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the grado
  UPDATE grados 
  SET activo = new_activo 
  WHERE id = grado_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grado not found with id: %', grado_id;
  END IF;
END;
$$;

-- Function to update grado menu option
CREATE OR REPLACE FUNCTION admin_update_grado_menu_option(grado_id uuid, new_tiene_opcion_menu boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Update the grado
  UPDATE grados 
  SET tiene_opcion_menu = new_tiene_opcion_menu 
  WHERE id = grado_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grado not found with id: %', grado_id;
  END IF;
END;
$$;