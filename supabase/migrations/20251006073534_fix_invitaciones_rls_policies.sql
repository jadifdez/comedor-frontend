/*
  # Fix invitaciones_comedor RLS policies
  
  ## Problem
  Current policies try to access auth.users table which causes permission errors.
  The policies need to be rewritten to avoid accessing auth.users directly.
  
  ## Solution
  Drop existing policies and recreate them to match the user's email directly
  through the padres table without going through auth.users.
  
  ## Changes
  - Drop all existing policies on invitaciones_comedor
  - Recreate policies that work correctly with RLS permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all invitations" ON invitaciones_comedor;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitaciones_comedor;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitaciones_comedor;
DROP POLICY IF EXISTS "Parents can view invitations for their children" ON invitaciones_comedor;
DROP POLICY IF EXISTS "Parents and staff can view own invitations" ON invitaciones_comedor;

-- Policy: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON invitaciones_comedor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.jwt() ->> 'email'
      AND activo = true
    )
  );

-- Policy: Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitaciones_comedor
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.jwt() ->> 'email'
      AND activo = true
    )
  );

-- Policy: Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON invitaciones_comedor
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.jwt() ->> 'email'
      AND activo = true
    )
  );

-- Policy: Parents can view invitations for their children
CREATE POLICY "Parents can view invitations for their children"
  ON invitaciones_comedor
  FOR SELECT
  TO authenticated
  USING (
    hijo_id IN (
      SELECT h.id FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Parents/Staff can view their own invitations
CREATE POLICY "Parents and staff can view own invitations"
  ON invitaciones_comedor
  FOR SELECT
  TO authenticated
  USING (
    padre_id IN (
      SELECT id FROM padres
      WHERE email = auth.jwt() ->> 'email'
    )
  );