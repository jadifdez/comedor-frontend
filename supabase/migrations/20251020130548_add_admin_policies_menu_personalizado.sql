/*
  # Add admin policies for comedor_menupersonalizado

  1. Changes
    - Add SELECT policy for administrators to view all menu selections
    - This allows the daily management view to display menu selections

  2. Security
    - Only users in the 'administradores' table can access all menu selections
    - Parents continue to have access only to their own and their children's menu selections
*/

-- Add admin SELECT policy for menu personalizado
CREATE POLICY "Admins can view all menu selections"
  ON comedor_menupersonalizado
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administradores
      WHERE administradores.email = auth.email()
    )
  );
