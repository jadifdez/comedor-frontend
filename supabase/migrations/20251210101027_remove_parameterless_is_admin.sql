/*
  # Remove parameterless is_admin() function

  1. Changes
    - Drop the is_admin() function without parameters
    - Keep only is_admin(text) which is used by RLS policies
  
  2. Security
    - All admin functions now use is_admin(auth.email()) explicitly
    - All RLS policies use is_admin(text) which remains unchanged
*/

-- Drop the parameterless version
DROP FUNCTION IF EXISTS is_admin();
