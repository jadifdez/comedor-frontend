/*
  # Create enfermedades table

  1. New Tables
    - `enfermedades`
      - `id` (uuid, primary key)
      - `hijo_id` (uuid, foreign key to hijos)
      - `hijo` (text, child's name)
      - `curso` (text, child's grade)
      - `tipo_enfermedad` (text, type of illness)
      - `descripcion` (text, optional description)
      - `requiere_dieta_blanda` (boolean, requires soft diet)
      - `fecha_inicio` (date, start date)
      - `fecha_fin` (date, optional end date)
      - `dias_dieta_blanda` (text[], days requiring soft diet)
      - `estado` (text, status: pendiente/aprobada/rechazada)
      - `user_id` (uuid, foreign key to auth.users)
      - `fecha_creacion` (timestamp, creation date)
      - `updated_at` (timestamp, last update)

  2. Security
    - Enable RLS on `enfermedades` table
    - Add policy for parents to manage their children's illness reports
*/

CREATE TABLE IF NOT EXISTS enfermedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo_id uuid NOT NULL REFERENCES hijos(id) ON DELETE CASCADE,
  hijo text NOT NULL,
  curso text NOT NULL,
  tipo_enfermedad text NOT NULL,
  descripcion text,
  requiere_dieta_blanda boolean NOT NULL DEFAULT false,
  fecha_inicio date NOT NULL,
  fecha_fin date,
  dias_dieta_blanda text[],
  estado text NOT NULL DEFAULT 'pendiente',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_creacion timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT enfermedades_estado_check CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'))
);

-- Enable RLS
ALTER TABLE enfermedades ENABLE ROW LEVEL SECURITY;

-- Create policy for parents to manage their children's illness reports
CREATE POLICY "Parents can manage illness reports for their children"
  ON enfermedades
  FOR ALL
  TO authenticated
  USING (
    hijo_id IN (
      SELECT h.id 
      FROM hijos h 
      JOIN padres p ON h.padre_id = p.id 
      WHERE p.email = auth.email()
    )
  )
  WITH CHECK (
    hijo_id IN (
      SELECT h.id 
      FROM hijos h 
      JOIN padres p ON h.padre_id = p.id 
      WHERE p.email = auth.email()
    )
  );

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_enfermedades_updated_at'
  ) THEN
    CREATE TRIGGER update_enfermedades_updated_at
      BEFORE UPDATE ON enfermedades
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;