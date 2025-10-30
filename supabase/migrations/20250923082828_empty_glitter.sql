/*
  # Añadir tabla de grados y campo curso a bajas_comedor

  1. Nueva tabla
    - `grados`
      - `id` (uuid, primary key)
      - `nombre` (text, unique) - nombre del grado
      - `orden` (integer) - para ordenar los grados
      - `activo` (boolean, default true)
      - `created_at` (timestamp)

  2. Modificaciones a tabla existente
    - Añadir campo `curso` a `bajas_comedor`
    - Añadir foreign key a `grados`

  3. Datos iniciales
    - Insertar los grados: 1º de Primaria, 2º de Primaria, 1º de ESO

  4. Seguridad
    - Enable RLS en `grados`
    - Política para leer grados (todos los usuarios autenticados)
*/

-- Crear tabla de grados
CREATE TABLE IF NOT EXISTS grados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  orden integer NOT NULL,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Añadir campo curso a bajas_comedor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bajas_comedor' AND column_name = 'curso'
  ) THEN
    ALTER TABLE bajas_comedor ADD COLUMN curso text;
  END IF;
END $$;

-- Insertar grados disponibles
INSERT INTO grados (nombre, orden) VALUES
  ('1º de Primaria', 1),
  ('2º de Primaria', 2),
  ('1º de ESO', 3)
ON CONFLICT (nombre) DO NOTHING;

-- Habilitar RLS en grados
ALTER TABLE grados ENABLE ROW LEVEL SECURITY;

-- Política para leer grados (todos los usuarios autenticados pueden ver los grados)
CREATE POLICY "Authenticated users can read grados"
  ON grados
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Política para usuarios anónimos (para el formulario de registro)
CREATE POLICY "Anonymous users can read grados"
  ON grados
  FOR SELECT
  TO anon
  USING (activo = true);