/*
  # Actualizar búsqueda en get_padres_total_count para incluir codigofacturacion

  1. Cambios
    - Agregar codigofacturacion a la condición de búsqueda WHERE
    - Permitir que el contador total considere búsquedas por código de facturación

  2. Propósito
    - Asegurar que la paginación funcione correctamente al buscar por código de facturación
    - Mantener consistencia con get_padres_with_counts
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_padres_total_count(text);

-- Recreate function with codigofacturacion search
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
     p.email ILIKE '%' || search_term || '%' OR
     (p.codigofacturacion IS NOT NULL AND p.codigofacturacion ILIKE '%' || search_term || '%'));
  
  RETURN total_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_padres_total_count TO authenticated;
