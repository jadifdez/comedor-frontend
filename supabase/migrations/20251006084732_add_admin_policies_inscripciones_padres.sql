/*
  # Add admin policies for comedor_inscripciones_padres

  1. Changes
    - Add SELECT policy for administrators to view all parent registrations
    - Add INSERT policy for administrators to create parent registrations
    - Add UPDATE policy for administrators to modify parent registrations
    - Add DELETE policy for administrators to remove parent registrations

  2. Security
    - Policies check if the authenticated user exists in the administradores table
    - Maintains existing policies for parents to manage their own registrations
    - Ensures administrators have full control over all parent comedor registrations

  3. Important Notes
    - These policies allow administrators to manage comedor registrations for any parent/staff member
    - Existing parent policies remain unchanged and continue to work as before
*/

-- Policy: Admins can view all parent comedor registrations
CREATE POLICY "Admins can view all parent comedor registrations"
  ON comedor_inscripciones_padres FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.jwt()->>'email'
      AND administradores.activo = true
    )
  );

-- Policy: Admins can create parent comedor registrations
CREATE POLICY "Admins can create parent comedor registrations"
  ON comedor_inscripciones_padres FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.jwt()->>'email'
      AND administradores.activo = true
    )
  );

-- Policy: Admins can update parent comedor registrations
CREATE POLICY "Admins can update parent comedor registrations"
  ON comedor_inscripciones_padres FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.jwt()->>'email'
      AND administradores.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.jwt()->>'email'
      AND administradores.activo = true
    )
  );

-- Policy: Admins can delete parent comedor registrations
CREATE POLICY "Admins can delete parent comedor registrations"
  ON comedor_inscripciones_padres FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.jwt()->>'email'
      AND administradores.activo = true
    )
  );
