/*
  # Add Dietary Restrictions and Allergies System

  1. New Tables
    - `restricciones_dieteticas`
      - `id` (uuid, primary key)
      - `nombre` (text) - Name of the restriction/allergy (e.g., "Alergia al gluten", "No come cerdo")
      - `descripcion` (text, optional) - Additional details about the restriction
      - `tipo` (text) - Type: 'alergia' or 'restriccion'
      - `activo` (boolean) - Whether this restriction is active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `hijos_restricciones_dieteticas`
      - `id` (uuid, primary key)
      - `hijo_id` (uuid, foreign key to hijos)
      - `restriccion_id` (uuid, foreign key to restricciones_dieteticas)
      - `notas_adicionales` (text, optional) - Additional notes from parents
      - `fecha_asignacion` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Admin policies: Full access for administrators
    - Parent policies: Can view and assign restrictions to their own children
*/

-- Create restricciones_dieteticas table
CREATE TABLE IF NOT EXISTS restricciones_dieteticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('alergia', 'restriccion')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hijos_restricciones_dieteticas table
CREATE TABLE IF NOT EXISTS hijos_restricciones_dieteticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo_id uuid NOT NULL REFERENCES hijos(id) ON DELETE CASCADE,
  restriccion_id uuid NOT NULL REFERENCES restricciones_dieteticas(id) ON DELETE CASCADE,
  notas_adicionales text,
  fecha_asignacion timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(hijo_id, restriccion_id)
);

-- Enable RLS
ALTER TABLE restricciones_dieteticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE hijos_restricciones_dieteticas ENABLE ROW LEVEL SECURITY;

-- Policies for restricciones_dieteticas table

-- Administrators can do everything
CREATE POLICY "Admins can view all dietary restrictions"
  ON restricciones_dieteticas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

CREATE POLICY "Admins can insert dietary restrictions"
  ON restricciones_dieteticas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

CREATE POLICY "Admins can update dietary restrictions"
  ON restricciones_dieteticas FOR UPDATE
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

CREATE POLICY "Admins can delete dietary restrictions"
  ON restricciones_dieteticas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Parents can view active dietary restrictions to assign to their children
CREATE POLICY "Parents can view active dietary restrictions"
  ON restricciones_dieteticas FOR SELECT
  TO authenticated
  USING (
    activo = true AND
    EXISTS (
      SELECT 1 FROM padres
      WHERE padres.email = auth.email()
    )
  );

-- Policies for hijos_restricciones_dieteticas table

-- Administrators can view all dietary restrictions assignments
CREATE POLICY "Admins can view all children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

CREATE POLICY "Admins can insert children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

CREATE POLICY "Admins can update children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR UPDATE
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

CREATE POLICY "Admins can delete children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );

-- Parents can view dietary restrictions of their own children
CREATE POLICY "Parents can view own children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hijos
      WHERE hijos.id = hijo_id
      AND hijos.padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  );

-- Parents can insert dietary restrictions for their own children
CREATE POLICY "Parents can insert own children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hijos
      WHERE hijos.id = hijo_id
      AND hijos.padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  );

-- Parents can update dietary restrictions for their own children
CREATE POLICY "Parents can update own children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hijos
      WHERE hijos.id = hijo_id
      AND hijos.padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hijos
      WHERE hijos.id = hijo_id
      AND hijos.padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  );

-- Parents can delete dietary restrictions for their own children
CREATE POLICY "Parents can delete own children dietary restrictions"
  ON hijos_restricciones_dieteticas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hijos
      WHERE hijos.id = hijo_id
      AND hijos.padre_id IN (
        SELECT id FROM padres WHERE email = auth.email()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restricciones_activo ON restricciones_dieteticas(activo);
CREATE INDEX IF NOT EXISTS idx_restricciones_tipo ON restricciones_dieteticas(tipo);
CREATE INDEX IF NOT EXISTS idx_hijos_restricciones_hijo ON hijos_restricciones_dieteticas(hijo_id);
CREATE INDEX IF NOT EXISTS idx_hijos_restricciones_restriccion ON hijos_restricciones_dieteticas(restriccion_id);

-- Create updated_at trigger for restricciones_dieteticas
CREATE OR REPLACE FUNCTION update_restricciones_dieteticas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restricciones_dieteticas_updated_at
  BEFORE UPDATE ON restricciones_dieteticas
  FOR EACH ROW
  EXECUTE FUNCTION update_restricciones_dieteticas_updated_at();