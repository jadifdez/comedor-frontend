/*
  # Create invitaciones_comedor table
  
  ## Description
  This migration creates a table to manage dining hall invitations for students and staff.
  Invitations can be for specific dates or recurring patterns. When someone is invited,
  they don't pay for that meal, even if they have a regular subscription.
  
  ## New Tables
  
  ### `invitaciones_comedor`
  - `id` (uuid, primary key): Unique identifier for each invitation
  - `fecha` (date, required): The specific date of the invitation
  - `hijo_id` (uuid, nullable): Reference to student if invitation is for a student
  - `padre_id` (uuid, nullable): Reference to parent/staff if invitation is for staff member
  - `nombre_completo` (text, nullable): Full name for external guests not in system
  - `motivo` (text, required): Reason for the invitation
  - `created_at` (timestamptz): When the invitation was created
  - `created_by` (uuid): Admin who created the invitation
  
  ## Business Rules
  - Either hijo_id, padre_id, or nombre_completo must be present (not all null)
  - Invitations override bajas (absences) and solicitudes (one-time requests)
  - Invitations are deducted from monthly billing
  - For recurring invitations, individual records are created for each date
  
  ## Security
  - Enable RLS on invitaciones_comedor table
  - Admins can view, create, and delete all invitations
  - Parents can view invitations for themselves and their children
  - Staff can view their own invitations
*/

-- Create the invitaciones_comedor table
CREATE TABLE IF NOT EXISTS invitaciones_comedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hijo_id uuid REFERENCES hijos(id) ON DELETE CASCADE,
  padre_id uuid REFERENCES padres(id) ON DELETE CASCADE,
  nombre_completo text,
  motivo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Ensure at least one of hijo_id, padre_id, or nombre_completo is provided
  CONSTRAINT invitacion_must_have_invitee CHECK (
    hijo_id IS NOT NULL OR padre_id IS NOT NULL OR nombre_completo IS NOT NULL
  ),
  
  -- Prevent duplicate invitations for same person on same date
  CONSTRAINT unique_invitation_per_date UNIQUE NULLS NOT DISTINCT (fecha, hijo_id, padre_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invitaciones_fecha ON invitaciones_comedor(fecha);
CREATE INDEX IF NOT EXISTS idx_invitaciones_hijo ON invitaciones_comedor(hijo_id) WHERE hijo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitaciones_padre ON invitaciones_comedor(padre_id) WHERE padre_id IS NOT NULL;

-- Enable RLS
ALTER TABLE invitaciones_comedor ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all invitations
CREATE POLICY "Admins can view all invitations"
  ON invitaciones_comedor
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );