/*
  # Crear tabla de administradores

  1. Nueva tabla
    - `administradores`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `nombre` (text)
      - `activo` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Enable RLS en `administradores` table
    - Solo administradores pueden gestionar la tabla de administradores
    - Función para verificar si un usuario es administrador

  3. Datos iniciales
    - Insertar administradores existentes
*/

-- Crear tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

-- Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin(user_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si no se proporciona email, usar el del usuario autenticado
  IF user_email IS NULL THEN
    user_email := auth.email();
  END IF;
  
  -- Verificar si el email existe en la tabla de administradores y está activo
  RETURN EXISTS (
    SELECT 1 
    FROM administradores 
    WHERE email = user_email AND activo = true
  );
END;
$$;

-- Función para obtener todos los administradores (solo para otros administradores)
CREATE OR REPLACE FUNCTION get_all_administradores()
RETURNS TABLE (
  id uuid,
  email text,
  nombre text,
  activo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo permitir si el usuario actual es administrador
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT a.id, a.email, a.nombre, a.activo, a.created_at, a.updated_at
  FROM administradores a
  ORDER BY a.nombre;
END;
$$;

-- Políticas RLS para la tabla administradores
CREATE POLICY "Solo administradores pueden leer administradores"
  ON administradores
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Solo administradores pueden insertar administradores"
  ON administradores
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Solo administradores pueden actualizar administradores"
  ON administradores
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Solo administradores pueden eliminar administradores"
  ON administradores
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_administradores_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_administradores_updated_at
  BEFORE UPDATE ON administradores
  FOR EACH ROW
  EXECUTE FUNCTION update_administradores_updated_at();

-- Insertar administradores iniciales
INSERT INTO administradores (email, nombre, activo) VALUES
  ('admin@lospinos.edu', 'Administrador Principal', true),
  ('administrador@lospinos.edu', 'Administrador Secundario', true),
  ('director@lospinos.edu', 'Director del Colegio', true),
  ('antoniogamez@gmail.com', 'Antonio Gámez', true)
ON CONFLICT (email) DO NOTHING;

-- Actualizar todas las políticas RLS existentes para usar la nueva función is_admin()
-- Tabla padres
DROP POLICY IF EXISTS "Admins can delete padres" ON padres;
DROP POLICY IF EXISTS "Admins can insert padres" ON padres;
DROP POLICY IF EXISTS "Admins can read all padres" ON padres;
DROP POLICY IF EXISTS "Admins can update padres" ON padres;

CREATE POLICY "Admins can delete padres"
  ON padres
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert padres"
  ON padres
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can read all padres"
  ON padres
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update padres"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tabla hijos
DROP POLICY IF EXISTS "Admins can delete hijos" ON hijos;
DROP POLICY IF EXISTS "Admins can insert hijos" ON hijos;
DROP POLICY IF EXISTS "Admins can read all hijos" ON hijos;
DROP POLICY IF EXISTS "Admins can update hijos" ON hijos;

CREATE POLICY "Admins can delete hijos"
  ON hijos
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert hijos"
  ON hijos
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can read all hijos"
  ON hijos
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update hijos"
  ON hijos
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tabla grados
DROP POLICY IF EXISTS "Admin users can delete grados" ON grados;
DROP POLICY IF EXISTS "Admin users can insert grados" ON grados;
DROP POLICY IF EXISTS "Admin users can update grados" ON grados;

CREATE POLICY "Admin users can delete grados"
  ON grados
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin users can insert grados"
  ON grados
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update grados"
  ON grados
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Tabla dias_festivos
DROP POLICY IF EXISTS "Admin users can manage dias_festivos" ON dias_festivos;

CREATE POLICY "Admin users can delete dias_festivos"
  ON dias_festivos
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin users can insert dias_festivos"
  ON dias_festivos
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update dias_festivos"
  ON dias_festivos
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can read dias_festivos"
  ON dias_festivos
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Tabla comedor_inscripciones
DROP POLICY IF EXISTS "Admins can manage all inscriptions" ON comedor_inscripciones;

CREATE POLICY "Admins can manage all inscriptions"
  ON comedor_inscripciones
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());