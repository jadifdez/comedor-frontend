/*
  # Agregar políticas RLS para administradores en bajas y solicitudes

  1. Changes
    - Agregar política para que administradores puedan ver todas las bajas
    - Agregar política para que administradores puedan ver todas las solicitudes puntuales
  
  2. Security
    - Los administradores (en tabla `administradores` con email activo) pueden ver todo
    - Los padres siguen solo viendo sus propias bajas/solicitudes
*/

-- Agregar política de SELECT para administradores en comedor_bajas
CREATE POLICY "Administradores can select all bajas"
  ON comedor_bajas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
      AND activo = true
    )
  );

-- Agregar política de SELECT para administradores en comedor_altaspuntuales
CREATE POLICY "Administradores can select all solicitudes"
  ON comedor_altaspuntuales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE email = auth.email()
      AND activo = true
    )
  );
