/*
  # Agregar política de INSERT para administradores en altas puntuales

  1. Nueva Política
    - Permite a los administradores crear altas puntuales en comedor_altaspuntuales
    - Los administradores necesitan poder dar de alta comidas facturables

  2. Security
    - Solo usuarios en tabla `administradores` con email activo pueden insertar
    - Se verifica usando la función is_admin()
*/

-- Agregar política de INSERT para administradores en comedor_altaspuntuales
CREATE POLICY "Administradores can insert solicitudes"
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
