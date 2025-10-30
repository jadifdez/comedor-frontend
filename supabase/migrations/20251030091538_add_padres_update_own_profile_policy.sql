/*
  # Add UPDATE policy for padres to modify their own profile

  1. Changes
    - Add policy allowing padres to update their own data (nombre, telefono, email)
    - Policy checks that the padre is updating their own record based on email

  2. Security
    - Padres can only update their own record
    - Uses email match with auth.email() for security
*/

-- Policy for padres to update their own profile data
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (true);