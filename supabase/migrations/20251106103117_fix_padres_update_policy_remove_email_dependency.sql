/*
  # Fix padres update policy to allow email changes

  1. Changes
    - Drop the existing "Padres can update own profile" policy
    - Create a new policy that doesn't depend on email matching for USING clause
    - Keep user_id check for both USING and WITH CHECK
    
  2. Security
    - Users can only update their own profile (user_id = auth.uid())
    - No dependency on email matching, which allows email changes
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create new policy that only checks user_id
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
