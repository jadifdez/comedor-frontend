/*
  # Sistema de Padres e Hijos para Comedor Escolar

  1. New Tables
    - `padres`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Email autorizado por el colegio
      - `nombre` (text) - Nombre completo del padre/madre
      - `telefono` (text, optional) - Teléfono de contacto
      - `activo` (boolean) - Si la cuenta está activa
      - `created_at` (timestamp)
    
    - `hijos`
      - `id` (uuid, primary key)
      - `nombre` (text) - Nombre completo del hijo
      - `curso` (text) - Curso actual (ej: "3º Primaria")
      - `padre_id` (uuid) - Referencia al padre
      - `activo` (boolean) - Si está activo en el comedor
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Padres can only see their own data
    - Hijos can only be seen by their padre
    - Only authenticated users with valid padre record can access

  3. Changes to existing table
    - Update bajas_comedor to reference hijo_id instead of text
    - Add foreign key constraint
*/

-- Create padres table
CREATE TABLE IF NOT EXISTS padres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nombre text NOT NULL,
  telefono text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create hijos table
CREATE TABLE IF NOT EXISTS hijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  curso text NOT NULL,
  padre_id uuid NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE padres ENABLE ROW LEVEL SECURITY;
ALTER TABLE hijos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for padres
CREATE POLICY "Padres can read own data"
  ON padres
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- RLS Policies for hijos
CREATE POLICY "Padres can read their hijos"
  ON hijos
  FOR SELECT
  TO authenticated
  USING (
    padre_id IN (
      SELECT id FROM padres WHERE email = auth.email()
    )
  );

-- Update bajas_comedor table structure
DO $$
BEGIN
  -- Add hijo_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bajas_comedor' AND column_name = 'hijo_id'
  ) THEN
    ALTER TABLE bajas_comedor ADD COLUMN hijo_id uuid REFERENCES hijos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policy for bajas_comedor to use the new structure
DROP POLICY IF EXISTS "Users can manage their own bajas" ON bajas_comedor;

CREATE POLICY "Padres can manage bajas of their hijos"
  ON bajas_comedor
  FOR ALL
  TO authenticated
  USING (
    hijo_id IN (
      SELECT h.id FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    )
  )
  WITH CHECK (
    hijo_id IN (
      SELECT h.id FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    )
  );

-- Insert sample data for testing
INSERT INTO padres (email, nombre, telefono) VALUES
  ('maria.garcia@email.com', 'María García Rodríguez', '666123456'),
  ('juan.lopez@email.com', 'Juan López Martín', '666789012'),
  ('ana.martinez@email.com', 'Ana Martínez Sánchez', '666345678')
ON CONFLICT (email) DO NOTHING;

-- Insert sample hijos
INSERT INTO hijos (nombre, curso, padre_id) 
SELECT 'Ana García López', '3º Primaria', p.id FROM padres p WHERE p.email = 'maria.garcia@email.com'
UNION ALL
SELECT 'Carlos García López', '5º Primaria', p.id FROM padres p WHERE p.email = 'maria.garcia@email.com'
UNION ALL
SELECT 'Lucía López Fernández', '2º Primaria', p.id FROM padres p WHERE p.email = 'juan.lopez@email.com'
UNION ALL
SELECT 'Diego López Fernández', '4º Primaria', p.id FROM padres p WHERE p.email = 'juan.lopez@email.com'
UNION ALL
SELECT 'Sofía Martínez Ruiz', '1º Primaria', p.id FROM padres p WHERE p.email = 'ana.martinez@email.com'
ON CONFLICT DO NOTHING;