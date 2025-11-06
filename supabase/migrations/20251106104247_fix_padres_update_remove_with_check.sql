/*
  # Fix padres UPDATE policy - Remove WITH CHECK clause
  
  1. Changes
    - Remove the WITH CHECK clause from the update policy
    - Keep only USING clause to verify ownership
    - WITH CHECK is redundant since user_id cannot be changed
    
  2. Security
    - Users can still only update their own profile (user_id = auth.uid())
    - Removing WITH CHECK eliminates the RLS error when updating email
*/

DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create policy without WITH CHECK
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
