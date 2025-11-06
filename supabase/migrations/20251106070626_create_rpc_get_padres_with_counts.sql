/*
  # Create RPC Function to Get Padres with Hijo Counts and Inscription Status

  1. Purpose
    - Replace multiple queries (padres + hijos + inscripciones) with a single optimized query
    - Reduce N+1 query problem in PadresManager component
    - Support pagination and search filtering at database level

  2. Function: get_padres_with_counts
    - Returns padres with aggregated hijo counts
    - Includes inscription status for personal/professors
    - Supports search by name or email
    - Supports pagination with limit and offset
    - Returns data optimized for admin display

  3. Performance Benefits
    - Single query instead of 3+ separate queries
    - Server-side filtering and pagination
    - Uses indexes for optimal performance
    - Reduces data transfer to client
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_padres_with_counts(text, integer, integer);

-- Create optimized function to get padres with counts
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
     p.email ILIKE '%' || search_term || '%')
  GROUP BY p.id, p.email, p.nombre, p.telefono, p.activo, p.es_personal, 
           p.exento_facturacion, p.motivo_exencion, p.fecha_inicio_exencion, 
           p.fecha_fin_exencion, p.created_at, i.id
  ORDER BY p.nombre
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_padres_with_counts TO authenticated;

-- Create function to get total count for pagination
CREATE OR REPLACE FUNCTION get_padres_total_count(search_term text DEFAULT '')
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM padres p
  WHERE 
    (search_term = '' OR 
     p.nombre ILIKE '%' || search_term || '%' OR 
     p.email ILIKE '%' || search_term || '%');
  
  RETURN total_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_padres_total_count TO authenticated;
