/*
  # Re-enable RLS on comedor_inscripciones_padres with correct policies

  1. Problem Solved
    - RLS was disabled for debugging
    - Root cause was NOT RLS but visualization logic (fixed in frontend)
    
  2. Solution
    - Re-enable RLS for security
    - Drop all existing policies (clean slate)
    - Create correct policies using auth.email() and is_admin()
      
  3. Security
    - RLS protects parent data
    - Only authenticated parents can access their own data
    - Admins have full access via is_admin() check
*/

-- Re-enable RLS
ALTER TABLE comedor_inscripciones_padres ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'comedor_inscripciones_padres'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON comedor_inscripciones_padres';
  END LOOP;
END $$;

-- Policy: Parents can manage their own inscriptions
CREATE POLICY "Parents can manage own inscripciones"
  ON comedor_inscripciones_padres
  FOR ALL
  TO authenticated
  USING (
    padre_id IN (
      SELECT id FROM padres WHERE email = auth.email()
    )
  )
  WITH CHECK (
    padre_id IN (
      SELECT id FROM padres WHERE email = auth.email()
    )
  );

-- Policy: Admins can manage all inscriptions
CREATE POLICY "Admins can manage all inscripciones"
  ON comedor_inscripciones_padres
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
