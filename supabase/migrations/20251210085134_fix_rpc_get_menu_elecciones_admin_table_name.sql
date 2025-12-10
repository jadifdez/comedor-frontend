/*
  # Fix RPC functions for menu selections
  
  1. Changes
    - Update `get_menu_principal_elecciones` to use correct admin table name
    - Update `get_menu_guarnicion_elecciones` to use correct admin table name
  
  2. Note
    - Changed from `comedor_administradores` to `administradores`
*/

-- Function to get main dish selections
CREATE OR REPLACE FUNCTION get_menu_principal_elecciones(opcion_id integer)
RETURNS TABLE(
  hijo_nombre text,
  padre_nombre text,
  curso text,
  fecha date,
  es_padre boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM administradores 
    WHERE email = auth.jwt()->>'email'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para acceder a esta información';
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN mp.hijo_id IS NOT NULL THEN 
        CONCAT(h.nombre, ' ', h.apellido1, COALESCE(' ' || h.apellido2, ''))
      ELSE 
        CONCAT(p.nombre, ' ', p.apellido1, COALESCE(' ' || p.apellido2, ''))
    END as hijo_nombre,
    CASE 
      WHEN mp.padre_id IS NOT NULL THEN 
        CONCAT(p.nombre, ' ', p.apellido1, COALESCE(' ' || p.apellido2, ''))
      ELSE NULL
    END as padre_nombre,
    COALESCE(g.nombre, 'Personal') as curso,
    mp.fecha,
    (mp.padre_id IS NOT NULL AND mp.hijo_id IS NULL) as es_padre
  FROM comedor_menupersonalizado mp
  LEFT JOIN hijos h ON mp.hijo_id = h.id
  LEFT JOIN padres p ON mp.padre_id = p.id
  LEFT JOIN grados g ON h.grado_id = g.id
  WHERE mp.opcion_principal_id = opcion_id
    AND mp.fecha >= CURRENT_DATE
  ORDER BY mp.fecha ASC, hijo_nombre ASC;
END;
$$;

-- Function to get side dish selections
CREATE OR REPLACE FUNCTION get_menu_guarnicion_elecciones(opcion_id integer)
RETURNS TABLE(
  hijo_nombre text,
  padre_nombre text,
  curso text,
  fecha date,
  es_padre boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM administradores 
    WHERE email = auth.jwt()->>'email'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para acceder a esta información';
  END IF;

  RETURN QUERY
  SELECT 
    CASE 
      WHEN mp.hijo_id IS NOT NULL THEN 
        CONCAT(h.nombre, ' ', h.apellido1, COALESCE(' ' || h.apellido2, ''))
      ELSE 
        CONCAT(p.nombre, ' ', p.apellido1, COALESCE(' ' || p.apellido2, ''))
    END as hijo_nombre,
    CASE 
      WHEN mp.padre_id IS NOT NULL THEN 
        CONCAT(p.nombre, ' ', p.apellido1, COALESCE(' ' || p.apellido2, ''))
      ELSE NULL
    END as padre_nombre,
    COALESCE(g.nombre, 'Personal') as curso,
    mp.fecha,
    (mp.padre_id IS NOT NULL AND mp.hijo_id IS NULL) as es_padre
  FROM comedor_menupersonalizado mp
  LEFT JOIN hijos h ON mp.hijo_id = h.id
  LEFT JOIN padres p ON mp.padre_id = p.id
  LEFT JOIN grados g ON h.grado_id = g.id
  WHERE mp.opcion_guarnicion_id = opcion_id
    AND mp.fecha >= CURRENT_DATE
  ORDER BY mp.fecha ASC, hijo_nombre ASC;
END;
$$;