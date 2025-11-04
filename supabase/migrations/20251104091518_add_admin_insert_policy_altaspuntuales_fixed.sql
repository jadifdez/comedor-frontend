/*
  # Agregar política de INSERT para administradores en altas puntuales (corregida)

  1. Nueva Política
    - Permite a los administradores crear altas puntuales en comedor_altaspuntuales
    - Los administradores necesitan poder dar de alta tanto a alumnos como a personal del comedor
    - Esta política complementa las existentes que permiten a padres insertar para ellos y sus hijos

  2. Security
    - Solo usuarios en tabla `administradores` con email activo pueden insertar
    - Verifica autenticación y membresía en tabla administradores
    - Permite insertar tanto hijo_id como padre_id

  3. Notas
    - Esta política es necesaria porque los administradores necesitan poder dar de alta al personal
    - Sin esta política, los inserts de administradores fallan con error de RLS
*/

-- Eliminar política duplicada si existe (con nombre incorrecto)
DROP POLICY IF EXISTS "Administradores can insert solicitudes" ON comedor_altaspuntuales;

-- Crear política correcta para administradores
CREATE POLICY "Administradores can insert altaspuntuales"
  ON comedor_altaspuntuales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
      AND activo = true
    )
  );
