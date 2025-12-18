/*
  # Actualizar búsqueda en get_padres_with_counts para incluir codigofacturacion

  1. Cambios
    - Agregar codigofacturacion a la condición de búsqueda WHERE
    - Permitir buscar padres por su código de facturación

  2. Propósito
    - Facilitar la búsqueda de padres mediante su código de facturación
    - Mejorar la usabilidad del sistema de administración
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_padres_with_counts(text, integer, integer);

-- Recreate function with codigofacturacion search
CREATE OR REPLACE FUNCTION get_padres_with_counts(
  search_term text DEFAULT '',
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  nombre text,
  telefono text,
  codigofacturacion text,
  activo boolean,
  es_personal boolean,
  exento_facturacion boolean,
  motivo_exencion text,
  fecha_inicio_exencion date,
  fecha_fin_exencion date,
  created_at timestamptz,
  hijos_count bigint,
  tiene_inscripcion_activa boolean,
  inscripcion_id uuid
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
    p.es_personal,
    p.exento_facturacion,
    p.motivo_exencion,
    p.fecha_inicio_exencion,
    p.fecha_fin_exencion,
    p.created_at,
    COALESCE(COUNT(DISTINCT h.id), 0) AS hijos_count,
    CASE 
      WHEN i.id IS NOT NULL THEN true 
      ELSE false 
    END AS tiene_inscripcion_activa,
    i.id AS inscripcion_id
  FROM padres p
  LEFT JOIN hijos h ON h.padre_id = p.id
  LEFT JOIN comedor_inscripciones_padres i ON i.padre_id = p.id AND i.activo = true
  WHERE 
    (search_term = '' OR 
     p.nombre ILIKE '%' || search_term || '%' OR 
     p.email ILIKE '%' || search_term || '%' OR
     (p.codigofacturacion IS NOT NULL AND p.codigofacturacion ILIKE '%' || search_term || '%'))
  GROUP BY p.id, p.email, p.nombre, p.telefono, p.codigofacturacion, p.activo, p.es_personal, 
           p.exento_facturacion, p.motivo_exencion, p.fecha_inicio_exencion, 
           p.fecha_fin_exencion, p.created_at, i.id
  ORDER BY p.nombre
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_padres_with_counts TO authenticated;
