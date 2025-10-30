/*
  # Create missing menu tables

  1. New Tables
    - `opciones_menu_principal`
      - `id` (uuid, primary key)
      - `dia_semana` (integer, 1=Monday to 5=Friday)
      - `nombre` (text, menu option name)
      - `activo` (boolean, default true)
      - `orden` (integer, display order)
      - `created_at` (timestamp)
    
    - `opciones_menu_guarnicion`
      - `id` (uuid, primary key)
      - `nombre` (text, side dish name)
      - `activo` (boolean, default true)
      - `orden` (integer, display order)
      - `created_at` (timestamp)
    
    - `elecciones_menu`
      - `id` (uuid, primary key)
      - `hijo_id` (uuid, foreign key to hijos)
      - `fecha` (date, YYYY-MM-DD format)
      - `opcion_principal_id` (uuid, foreign key to opciones_menu_principal)
      - `opcion_guarnicion_id` (uuid, foreign key to opciones_menu_guarnicion)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read menu options
    - Add policies for parents to manage their children's menu selections

  3. Data
    - Insert predefined menu options for each day of the week
    - Insert side dish options (Verduras, Patatas, Ensalada)
*/

-- Create opciones_menu_principal table
CREATE TABLE IF NOT EXISTS opciones_menu_principal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana integer NOT NULL CHECK (dia_semana >= 1 AND dia_semana <= 5),
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  orden integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create opciones_menu_guarnicion table
CREATE TABLE IF NOT EXISTS opciones_menu_guarnicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  orden integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create elecciones_menu table
CREATE TABLE IF NOT EXISTS elecciones_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo_id uuid NOT NULL,
  fecha date NOT NULL,
  opcion_principal_id uuid NOT NULL,
  opcion_guarnicion_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hijo_id, fecha)
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'elecciones_menu_hijo_id_fkey'
  ) THEN
    ALTER TABLE elecciones_menu 
    ADD CONSTRAINT elecciones_menu_hijo_id_fkey 
    FOREIGN KEY (hijo_id) REFERENCES hijos(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'elecciones_menu_opcion_principal_id_fkey'
  ) THEN
    ALTER TABLE elecciones_menu 
    ADD CONSTRAINT elecciones_menu_opcion_principal_id_fkey 
    FOREIGN KEY (opcion_principal_id) REFERENCES opciones_menu_principal(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'elecciones_menu_opcion_guarnicion_id_fkey'
  ) THEN
    ALTER TABLE elecciones_menu 
    ADD CONSTRAINT elecciones_menu_opcion_guarnicion_id_fkey 
    FOREIGN KEY (opcion_guarnicion_id) REFERENCES opciones_menu_guarnicion(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'elecciones_menu_user_id_fkey'
  ) THEN
    ALTER TABLE elecciones_menu 
    ADD CONSTRAINT elecciones_menu_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE opciones_menu_principal ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_menu_guarnicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE elecciones_menu ENABLE ROW LEVEL SECURITY;

-- Create policies for opciones_menu_principal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'opciones_menu_principal' 
    AND policyname = 'Authenticated users can read menu options'
  ) THEN
    CREATE POLICY "Authenticated users can read menu options"
      ON opciones_menu_principal
      FOR SELECT
      TO authenticated
      USING (activo = true);
  END IF;
END $$;

-- Create policies for opciones_menu_guarnicion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'opciones_menu_guarnicion' 
    AND policyname = 'Authenticated users can read side dish options'
  ) THEN
    CREATE POLICY "Authenticated users can read side dish options"
      ON opciones_menu_guarnicion
      FOR SELECT
      TO authenticated
      USING (activo = true);
  END IF;
END $$;

-- Create policies for elecciones_menu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'elecciones_menu' 
    AND policyname = 'Parents can manage menu selections for their children'
  ) THEN
    CREATE POLICY "Parents can manage menu selections for their children"
      ON elecciones_menu
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
  END IF;
END $$;

-- Insert menu options for each day of the week
INSERT INTO opciones_menu_principal (dia_semana, nombre, orden) VALUES
-- Lunes (1)
(1, 'Pollo a la plancha', 1),
(1, 'Hamburguesa', 2),
(1, 'Pescado empanado', 3),
-- Martes (2)
(2, 'Pollo a la plancha', 1),
(2, 'Pollo empanado', 2),
(2, 'Pescado a la plancha', 3),
-- Miércoles (3)
(3, 'Pollo a la plancha', 1),
(3, 'Filete ruso', 2),
(3, 'Pescado empanado', 3),
-- Jueves (4)
(4, 'Pollo a la plancha', 1),
(4, 'Croquetas', 2),
(4, 'Pescado a la plancha', 3),
-- Viernes (5)
(5, 'Pollo a la plancha', 1),
(5, 'San Jacobo', 2),
(5, 'Pescado empanado', 3)
ON CONFLICT DO NOTHING;

-- Insert side dish options
INSERT INTO opciones_menu_guarnicion (nombre, orden) VALUES
('Verduras', 1),
('Patatas', 2),
('Ensalada', 3)
ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at on elecciones_menu
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
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_elecciones_menu_updated_at'
  ) THEN
    CREATE TRIGGER update_elecciones_menu_updated_at
      BEFORE UPDATE ON elecciones_menu
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;