/*
  # Fix duplicate RLS policies for comedor_inscripciones_padres

  1. Problem
    - There are duplicate policies (some use is_admin(), others check administradores directly)
    - This can cause confusion and potential conflicts

  2. Solution
    - Drop old policies that directly check administradores table
    - Keep only the ones that use is_admin() function
    - This unifies the authorization logic

  3. Result
    - Cleaner, more maintainable RLS setup
    - All admin checks go through is_admin() function
*/

-- Drop duplicate admin policies (the ones that check administradores directly)
DROP POLICY IF EXISTS "Admins can view all parent comedor registrations" ON comedor_inscripciones_padres;
DROP POLICY IF EXISTS "Admins can create parent comedor registrations" ON comedor_inscripciones_padres;
DROP POLICY IF EXISTS "Admins can update parent comedor registrations" ON comedor_inscripciones_padres;
DROP POLICY IF EXISTS "Admins can delete parent comedor registrations" ON comedor_inscripciones_padres;

-- Keep these policies (they use is_admin()):
-- "Admins can read all parent comedor inscriptions"
-- "Admins can insert parent comedor inscriptions"
-- "Admins can update parent comedor inscriptions"
-- "Admins can delete parent comedor inscriptions"

-- Keep these policies (for parents):
-- "Parents can view own comedor registrations"
-- "Personal parents can create own comedor registrations"
-- "Parents can update own comedor registrations"
-- "Parents can delete own comedor registrations"
