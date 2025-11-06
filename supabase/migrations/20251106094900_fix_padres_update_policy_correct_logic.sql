/*
  # Fix padres UPDATE policy to properly handle email changes

  1. Problem
    - The previous WITH CHECK clause used a subquery that checks email = auth.email()
    - When updating the email field, the NEW row has a different email
    - This causes the subquery to fail and RLS to reject the update

  2. Solution
    - Use a simpler WITH CHECK that compares the OLD record's email with auth.email()
    - This is done by checking that we're updating a record where the current email matches
    - The USING clause already ensures we can only update our own record
    - WITH CHECK should just ensure the ID hasn't changed (it can't, it's the primary key)

  3. Security
    - USING: Parent can only update records where current email = auth.email()
    - WITH CHECK: Simplified to allow the update as long as USING passed
    - This allows email changes while maintaining security
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create corrected policy
-- The key insight: USING checks the OLD row, WITH CHECK validates the NEW row
-- Since we're updating by ID and USING already verified ownership, 
-- WITH CHECK just needs to verify the record still belongs to the same padre
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email() OR id IN (
    SELECT id FROM padres WHERE email = auth.email()
  ));
