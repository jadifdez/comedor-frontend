/*
  # Add Last-Minute Cancellations System

  1. New Tables
    - `comedor_cancelaciones_ultimo_momento`
      - `id` (uuid, primary key)
      - `fecha` (date) - Date of the canceled meal
      - `hijo_id` (uuid, optional) - Reference to student
      - `padre_id` (uuid, optional) - Reference to parent/staff
      - `motivo` (text, optional) - Reason for cancellation
      - `cancelado_por` (uuid) - Admin who canceled it
      - `created_at` (timestamp)
      - At least one of hijo_id or padre_id must be present
      - This table records last-minute cancellations that should NOT be charged

  2. Important Notes
    - These cancellations are different from regular "bajas" (scheduled absences)
    - Last-minute cancellations prevent billing for that specific day
    - Only administrators can create these cancellations
    - Once created, the meal should not appear in billing calculations

  3. Security
    - Enable RLS
    - Only administrators can insert/update/delete cancellations
    - Administrators can view all cancellations
*/

-- Create comedor_cancelaciones_ultimo_momento table
CREATE TABLE IF NOT EXISTS comedor_cancelaciones_ultimo_momento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hijo_id uuid REFERENCES hijos(id) ON DELETE CASCADE,
  padre_id uuid REFERENCES padres(id) ON DELETE CASCADE,
  motivo text,
  cancelado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cancelacion_persona_check CHECK (
    (hijo_id IS NOT NULL AND padre_id IS NULL) OR 
    (hijo_id IS NULL AND padre_id IS NOT NULL)
  ),
  CONSTRAINT cancelacion_unica UNIQUE (fecha, hijo_id, padre_id)
);

-- Enable RLS
ALTER TABLE comedor_cancelaciones_ultimo_momento ENABLE ROW LEVEL SECURITY;

-- Administrators can view all cancellations
CREATE POLICY "Admins can view all last-minute cancellations"
  ON comedor_cancelaciones_ultimo_momento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Administrators can insert cancellations
CREATE POLICY "Admins can insert last-minute cancellations"
  ON comedor_cancelaciones_ultimo_momento FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Administrators can update cancellations
CREATE POLICY "Admins can update last-minute cancellations"
  ON comedor_cancelaciones_ultimo_momento FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Administrators can delete cancellations
CREATE POLICY "Admins can delete last-minute cancellations"
  ON comedor_cancelaciones_ultimo_momento FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cancelaciones_fecha ON comedor_cancelaciones_ultimo_momento(fecha);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_hijo ON comedor_cancelaciones_ultimo_momento(hijo_id);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_padre ON comedor_cancelaciones_ultimo_momento(padre_id);
