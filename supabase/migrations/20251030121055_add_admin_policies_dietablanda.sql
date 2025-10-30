/*
  # Add Admin Policies for comedor_dietablanda

  1. Changes
    - Add SELECT policy for administrators to view all diet records
    - Add INSERT policy for administrators to create diet records
    - Add UPDATE policy for administrators to modify diet records
    - Add DELETE policy for administrators to remove diet records

  2. Security
    - Policies check that user is an administrator via administradores table
    - Uses auth.email() to verify admin status
*/

-- Admin can view all diet records
CREATE POLICY "Admins can view all diet records"
  ON comedor_dietablanda
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
    )
  );

-- Admin can insert diet records
CREATE POLICY "Admins can insert diet records"
  ON comedor_dietablanda
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
    )
  );

-- Admin can update diet records
CREATE POLICY "Admins can update diet records"
  ON comedor_dietablanda
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
    )
  );

-- Admin can delete diet records
CREATE POLICY "Admins can delete diet records"
  ON comedor_dietablanda
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
    )
  );
