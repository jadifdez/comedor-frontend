/*
  # Add Admin Policies for comedor_bajas

  1. Changes
    - Add INSERT policy for admins on comedor_bajas table
    - Add DELETE policy for admins on comedor_bajas table
  
  2. Security
    - Only authenticated users with admin role can insert/delete bajas
    - Uses is_admin() function to verify permissions
*/

-- Policy for admins to insert bajas
DROP POLICY IF EXISTS "Admins can insert bajas" ON comedor_bajas;
CREATE POLICY "Admins can insert bajas"
  ON comedor_bajas
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Policy for admins to delete bajas
DROP POLICY IF EXISTS "Admins can delete bajas" ON comedor_bajas;
CREATE POLICY "Admins can delete bajas"
  ON comedor_bajas
  FOR DELETE
  TO authenticated
  USING (is_admin());