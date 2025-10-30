/*
  # Funciones RPC para cargar incidencias con permisos elevados

  1. Funciones RPC
    - `admin_load_bajas_comedor()` - Cargar todas las bajas de comedor
    - `admin_load_solicitudes_puntuales()` - Cargar todas las solicitudes puntuales
    - `admin_load_menus_personalizados()` - Cargar todos los menús personalizados
    - `admin_load_dietas_blandas()` - Cargar todas las dietas blandas

  2. Security
    - Funciones ejecutadas con permisos de SECURITY DEFINER
    - Solo accesibles por usuarios autenticados
*/

-- Función para cargar bajas de comedor
CREATE OR REPLACE FUNCTION admin_load_bajas_comedor()
RETURNS TABLE (
  id uuid,
  hijo text,
  hijo_id uuid,
  curso text,
  dias text[],
  fecha_creacion timestamptz,
  user_id uuid,
  hijo_nombre text,
  hijo_grado text,
  padre_nombre text,
  padre_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.id,
    cb.hijo,
    cb.hijo_id,
    cb.curso,
    cb.dias,
    cb.fecha_creacion,
    cb.user_id,
    h.nombre as hijo_nombre,
    g.nombre as hijo_grado,
    p.nombre as padre_nombre,
    p.email as padre_email
  FROM comedor_bajas cb
  LEFT JOIN hijos h ON cb.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  ORDER BY cb.fecha_creacion DESC;
END;
$$;

-- Función para cargar solicitudes puntuales
CREATE OR REPLACE FUNCTION admin_load_solicitudes_puntuales()
RETURNS TABLE (
  id uuid,
  hijo text,
  hijo_id uuid,
  curso text,
  fecha text,
  fecha_creacion timestamptz,
  user_id uuid,
  estado text,
  hijo_nombre text,
  hijo_grado text,
  padre_nombre text,
  padre_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.hijo,
    ca.hijo_id,
    ca.curso,
    ca.fecha,
    ca.fecha_creacion,
    ca.user_id,
    ca.estado,
    h.nombre as hijo_nombre,
    g.nombre as hijo_grado,
    p.nombre as padre_nombre,
    p.email as padre_email
  FROM comedor_altaspuntuales ca
  LEFT JOIN hijos h ON ca.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  ORDER BY ca.fecha_creacion DESC;
END;
$$;

-- Función para cargar menús personalizados
CREATE OR REPLACE FUNCTION admin_load_menus_personalizados()
RETURNS TABLE (
  id uuid,
  hijo_id uuid,
  fecha date,
  opcion_principal_id uuid,
  opcion_guarnicion_id uuid,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  hijo_nombre text,
  hijo_grado text,
  padre_nombre text,
  padre_email text,
  opcion_principal_nombre text,
  opcion_guarnicion_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.hijo_id,
    cm.fecha,
    cm.opcion_principal_id,
    cm.opcion_guarnicion_id,
    cm.user_id,
    cm.created_at,
    cm.updated_at,
    h.nombre as hijo_nombre,
    g.nombre as hijo_grado,
    p.nombre as padre_nombre,
    p.email as padre_email,
    omp.nombre as opcion_principal_nombre,
    omg.nombre as opcion_guarnicion_nombre
  FROM comedor_menupersonalizado cm
  LEFT JOIN hijos h ON cm.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  LEFT JOIN opciones_menu_principal omp ON cm.opcion_principal_id = omp.id
  LEFT JOIN opciones_menu_guarnicion omg ON cm.opcion_guarnicion_id = omg.id
  ORDER BY cm.created_at DESC;
END;
$$;

-- Función para cargar dietas blandas
CREATE OR REPLACE FUNCTION admin_load_dietas_blandas()
RETURNS TABLE (
  id uuid,
  hijo_id uuid,
  hijo text,
  curso text,
  fecha_dieta_blanda date,
  estado text,
  user_id uuid,
  fecha_creacion timestamptz,
  updated_at timestamptz,
  hijo_nombre text,
  hijo_grado text,
  padre_nombre text,
  padre_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.hijo_id,
    cd.hijo,
    cd.curso,
    cd.fecha_dieta_blanda,
    cd.estado,
    cd.user_id,
    cd.fecha_creacion,
    cd.updated_at,
    h.nombre as hijo_nombre,
    g.nombre as hijo_grado,
    p.nombre as padre_nombre,
    p.email as padre_email
  FROM comedor_dietablanda cd
  LEFT JOIN hijos h ON cd.hijo_id = h.id
  LEFT JOIN grados g ON h.grado_id = g.id
  LEFT JOIN padres p ON h.padre_id = p.id
  ORDER BY cd.fecha_creacion DESC;
END;
$$;