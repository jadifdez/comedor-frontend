/*
  # Create configuracion_precios table

  1. New Tables
    - `configuracion_precios`
      - `id` (uuid, primary key)
      - `nombre` (text) - Descriptive name for the price configuration
      - `dias_min` (integer) - Minimum number of days
      - `dias_max` (integer) - Maximum number of days
      - `precio` (numeric) - Price per day
      - `activo` (boolean) - Whether this configuration is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `configuracion_precios` table
    - Add policy for authenticated users to read configurations
    - Add policy for admin users to manage configurations

  3. Initial Data
    - Insert default price configurations (1-3 days: 9.15€, 4-5 days: 7.50€)
*/

CREATE TABLE IF NOT EXISTS configuracion_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  dias_min integer NOT NULL CHECK (dias_min > 0 AND dias_min <= 5),
  dias_max integer NOT NULL CHECK (dias_max > 0 AND dias_max <= 5),
  precio numeric(10, 2) NOT NULL CHECK (precio > 0),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT dias_range_check CHECK (dias_max >= dias_min)
);

ALTER TABLE configuracion_precios ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read configurations
CREATE POLICY "Authenticated users can read price configurations"
  ON configuracion_precios
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for admin users to insert configurations
CREATE POLICY "Admin users can insert price configurations"
  ON configuracion_precios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Policy for admin users to update configurations
CREATE POLICY "Admin users can update price configurations"
  ON configuracion_precios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Policy for admin users to delete configurations
CREATE POLICY "Admin users can delete price configurations"
  ON configuracion_precios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
      AND administradores.activo = true
    )
  );

-- Insert default price configurations
INSERT INTO configuracion_precios (nombre, dias_min, dias_max, precio, activo)
VALUES 
  ('Precio 1-3 días', 1, 3, 9.15, true),
  ('Precio 4-5 días', 4, 5, 7.50, true)
ON CONFLICT DO NOTHING;