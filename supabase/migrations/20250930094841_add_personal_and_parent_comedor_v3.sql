/*
  # Add personal staff functionality and parent comedor registration

  1. Changes to existing tables
    - Add `es_personal` field to padres table (boolean, default false)
    - Add `precio_adulto` field to configuracion_precios table for staff meal pricing

  2. New Tables
    - `comedor_inscripciones_padres` - Parent comedor registrations
      - `id` (uuid, primary key)
      - `padre_id` (uuid, foreign key to padres)
      - `dias_semana` (integer array, 1-5 for Mon-Fri)
      - `precio_diario` (numeric, price per day)
      - `activo` (boolean, active status)
      - `fecha_inicio` (date, service start date)
      - `fecha_fin` (date, service end date, nullable)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on comedor_inscripciones_padres
    - Parents can only manage their own registrations (matched by email)
    - No discounts apply to parent registrations
    - Parents cannot select menu (handled in frontend)

  4. Important Notes
    - Parent registrations do NOT count towards family discounts
    - Parent registrations have fixed pricing (precio_adulto)
    - No menu selection for parent registrations
    - Only parents with es_personal = true can register themselves
*/

-- Add es_personal field to padres table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'padres' AND column_name = 'es_personal'
  ) THEN
    ALTER TABLE padres ADD COLUMN es_personal boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add precio_adulto to configuracion_precios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_precios' AND column_name = 'precio_adulto'
  ) THEN
    ALTER TABLE configuracion_precios ADD COLUMN precio_adulto numeric(10,2) DEFAULT 9.15 NOT NULL;
  END IF;
END $$;

-- Create comedor_inscripciones_padres table
CREATE TABLE IF NOT EXISTS comedor_inscripciones_padres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  padre_id uuid NOT NULL REFERENCES padres(id) ON DELETE CASCADE,
  dias_semana integer[] NOT NULL CHECK (array_length(dias_semana, 1) > 0),
  precio_diario numeric(10,2) NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_dias_semana CHECK (dias_semana <@ ARRAY[1,2,3,4,5]),
  CONSTRAINT valid_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- Enable RLS on comedor_inscripciones_padres
ALTER TABLE comedor_inscripciones_padres ENABLE ROW LEVEL SECURITY;

-- Policy: Parents can view their own registrations
CREATE POLICY "Parents can view own comedor registrations"
  ON comedor_inscripciones_padres FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM padres 
      WHERE padres.id = comedor_inscripciones_padres.padre_id 
      AND padres.email = auth.jwt()->>'email'
    )
  );

-- Policy: Parents can insert their own registrations (only if es_personal)
CREATE POLICY "Personal parents can create own comedor registrations"
  ON comedor_inscripciones_padres FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM padres 
      WHERE padres.id = comedor_inscripciones_padres.padre_id 
      AND padres.email = auth.jwt()->>'email'
      AND padres.es_personal = true
    )
  );

-- Policy: Parents can update their own registrations
CREATE POLICY "Parents can update own comedor registrations"
  ON comedor_inscripciones_padres FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM padres 
      WHERE padres.id = comedor_inscripciones_padres.padre_id 
      AND padres.email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM padres 
      WHERE padres.id = comedor_inscripciones_padres.padre_id 
      AND padres.email = auth.jwt()->>'email'
    )
  );

-- Policy: Parents can delete their own registrations
CREATE POLICY "Parents can delete own comedor registrations"
  ON comedor_inscripciones_padres FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM padres 
      WHERE padres.id = comedor_inscripciones_padres.padre_id 
      AND padres.email = auth.jwt()->>'email'
    )
  );

-- Create function to set precio_diario on insert for parents
CREATE OR REPLACE FUNCTION set_precio_padre_comedor()
RETURNS TRIGGER AS $$
DECLARE
  precio_config numeric(10,2);
BEGIN
  -- Get precio_adulto from active configuration
  SELECT precio_adulto INTO precio_config
  FROM configuracion_precios
  WHERE activo = true
  LIMIT 1;
  
  IF precio_config IS NULL THEN
    precio_config := 9.15; -- Default fallback
  END IF;
  
  NEW.precio_diario := precio_config;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set precio on insert
CREATE TRIGGER set_precio_padre_comedor_trigger
  BEFORE INSERT ON comedor_inscripciones_padres
  FOR EACH ROW
  EXECUTE FUNCTION set_precio_padre_comedor();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_comedor_inscripciones_padres_padre_id 
  ON comedor_inscripciones_padres(padre_id);
CREATE INDEX IF NOT EXISTS idx_comedor_inscripciones_padres_activo 
  ON comedor_inscripciones_padres(activo);
CREATE INDEX IF NOT EXISTS idx_padres_es_personal 
  ON padres(es_personal);