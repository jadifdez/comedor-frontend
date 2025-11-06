/*
  # Fix padres UPDATE policy - Use ID-based matching
  
  1. Changes
    - Change policy to match by ID instead of user_id
    - This works because we're already filtering by .eq('id', padreData.id) in the frontend
    - The ID cannot be changed by the user, so this is secure
    
  2. Security
    - Users can only update rows they can SELECT (which requires user_id = auth.uid() OR email = auth.email())
    - The UPDATE only affects the specific row with the given ID
    - Since SELECT already verified ownership, UPDATE is safe
*/

DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create policy that matches the row we're updating
-- Since we filter by ID in the frontend (.eq('id', padreData.id)),
-- and the SELECT policy already verified we own this row,
-- we just need to allow the update to proceed
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow update if we can read this row (SELECT policy handles ownership)
    id IN (
      SELECT id FROM padres 
      WHERE user_id = auth.uid() OR email = auth.email()
    )
  );
