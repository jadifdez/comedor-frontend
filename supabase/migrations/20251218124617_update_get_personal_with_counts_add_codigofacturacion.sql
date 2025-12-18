/*
  # Actualizar función get_personal_with_counts para incluir codigofacturacion

  1. Cambios
    - Agregar campo codigofacturacion al tipo de retorno de la función
    - Incluir codigofacturacion en la consulta SELECT
    - Agregar codigofacturacion al GROUP BY

  2. Propósito
    - Permitir que el campo codigofacturacion se muestre en la interfaz de gestión de personal
    - Asegurar que los cambios se reflejen inmediatamente después de guardar
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_personal_with_counts();

-- Recreate function with codigofacturacion field
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
  tiene_inscripcion_activa boolean
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
    ) as tiene_inscripcion_activa
  FROM padres p
  LEFT JOIN hijos h ON h.padre_id = p.id AND h.activo = true
  WHERE p.es_personal = true
  GROUP BY p.id, p.email, p.nombre, p.telefono, p.codigofacturacion, p.activo, p.created_at, 
           p.es_personal, p.exento_facturacion, p.motivo_exencion, 
           p.fecha_inicio_exencion, p.fecha_fin_exencion, p.user_id
  ORDER BY p.nombre;
END;
$$;