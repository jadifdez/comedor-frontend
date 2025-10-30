/*
  # Create admin function to load all grados

  1. New Functions
    - `admin_load_all_grados`: Loads all grados regardless of RLS policies
  
  2. Security
    - SECURITY DEFINER: Runs with elevated privileges
    - Admin check: Verifies user is admin before allowing access
    - Bypasses RLS: Can see all grados including inactive ones
*/

-- Function to load all grados for admin users
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
  IF NOT (
    auth.email() = ANY (ARRAY['admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com']) 
    OR auth.email() LIKE '%admin%'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all grados regardless of RLS policies
  RETURN QUERY
  SELECT g.id, g.nombre, g.orden, g.activo, g.created_at, g.tiene_opcion_menu
  FROM grados g
  ORDER BY g.orden;
END;
$$;