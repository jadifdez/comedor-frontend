/*
  # Remove old integer-based RPC functions
  
  1. Changes
    - Drop old versions of get_menu_principal_elecciones that accept integer
    - Drop old versions of get_menu_guarnicion_elecciones that accept integer
    - Keep only the UUID versions
  
  2. Reason
    - PostgreSQL function overloading was causing it to call the wrong version
    - The tables use UUID as primary key, not integer
*/

-- Drop old integer-based functions
DROP FUNCTION IF EXISTS get_menu_principal_elecciones(integer);
DROP FUNCTION IF EXISTS get_menu_guarnicion_elecciones(integer);
