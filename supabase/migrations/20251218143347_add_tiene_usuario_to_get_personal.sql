/*
  # Agregar indicador de usuario autenticado a get_personal_with_counts

  1. Cambios
    - Agregar campo tiene_usuario al resultado de get_personal_with_counts
    - Este campo indica si el personal tiene una cuenta de usuario en auth.users

  2. Propósito
    - Permitir mostrar un indicador visual en la interfaz cuando un miembro del personal tiene usuario
    - Facilitar la identificación de personal que puede acceder al sistema
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_personal_with_counts();

-- Recreate function with tiene_usuario field
CREATE OR REPLACE FUNCTION get_personal_with_counts()
RETURNS TABLE (
  id uuid,
  email text,
  nombre text,
  telefono text,
  codigofacturacion text,
  activo boolean,
  created_at timestamptz,
  es_personal boolean,
  exento_facturacion boolean,
  motivo_exencion text,
  fecha_inicio_exencion date,
  fecha_fin_exencion date,
  user_id uuid,
  hijos_count bigint,
  tiene_inscripcion_activa boolean,
  tiene_usuario boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.nombre,
    p.telefono,
    p.codigofacturacion,
    p.activo,
    p.created_at,
    p.es_personal,
    p.exento_facturacion,
    p.motivo_exencion,
    p.fecha_inicio_exencion,
    p.fecha_fin_exencion,
    p.user_id,
    COALESCE(COUNT(DISTINCT h.id), 0) as hijos_count,
    EXISTS(
      SELECT 1
      FROM comedor_inscripciones_padres ip
      WHERE ip.padre_id = p.id
      AND ip.activo = true
    ) as tiene_inscripcion_activa,
    CASE
      WHEN au.id IS NOT NULL THEN true
      ELSE false
    END AS tiene_usuario
  FROM padres p
  LEFT JOIN hijos h ON h.padre_id = p.id AND h.activo = true
  LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(p.email)
  WHERE p.es_personal = true
  GROUP BY p.id, p.email, p.nombre, p.telefono, p.codigofacturacion, p.activo, p.created_at,
           p.es_personal, p.exento_facturacion, p.motivo_exencion,
           p.fecha_inicio_exencion, p.fecha_fin_exencion, p.user_id, au.id
  ORDER BY p.nombre;
END;
$$;