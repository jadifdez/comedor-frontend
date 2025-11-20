/*
  # Add admin policies for comedor_inscripciones_padres table

  1. New Policies
    - Admins can read all parent comedor inscriptions
    - Admins can insert parent comedor inscriptions
    - Admins can update parent comedor inscriptions
    - Admins can delete parent comedor inscriptions

  2. Important Notes
    - This allows admins to view parent inscriptions in the billing dashboard
    - This allows admins to manage parent inscriptions in the PersonalManager component
    - Existing policies for parents remain unchanged
*/

-- Policy: Admins can read all parent comedor inscriptions
CREATE POLICY "Admins can read all parent comedor inscriptions"
  ON comedor_inscripciones_padres
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy: Admins can insert parent comedor inscriptions
CREATE POLICY "Admins can insert parent comedor inscriptions"
  ON comedor_inscripciones_padres
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Policy: Admins can update parent comedor inscriptions
CREATE POLICY "Admins can update parent comedor inscriptions"
  ON comedor_inscripciones_padres
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Admins can delete parent comedor inscriptions
CREATE POLICY "Admins can delete parent comedor inscriptions"
  ON comedor_inscripciones_padres
  FOR DELETE
  TO authenticated
  USING (is_admin());