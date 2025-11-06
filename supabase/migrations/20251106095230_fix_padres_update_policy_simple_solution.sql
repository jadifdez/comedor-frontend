/*
  # Fix padres UPDATE policy - Simple and correct solution

  1. Problem Analysis
    - Most padres records don't have user_id populated (819 out of 825)
    - When changing email, auth.email() returns OLD email but NEW row has different email
    - Policy WITH CHECK fails because: new email ≠ auth.email() AND user_id is NULL
  
  2. Solution
    - USING clause: Check OLD row (can use email = auth.email())
    - WITH CHECK clause: Allow update if the ID matches a record we own
    - This works because USING already verified we own the record
    - WITH CHECK just needs to ensure we're not hijacking another record's ID

  3. Security
    - USING: Only update records where current email matches auth.email()
    - WITH CHECK: Ensure the new row's ID belongs to us (via subquery on OLD email)
    - This allows email changes while maintaining security
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create corrected policy
-- The key: USING checks OLD row, WITH CHECK allows the update as long as
-- the ID being updated belongs to a record with our current auth.email()
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    email = auth.email()
  )
  WITH CHECK (
    id IN (SELECT id FROM padres WHERE email = auth.email())
  );
