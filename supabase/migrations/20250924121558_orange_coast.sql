/*
  # Fix RLS UPDATE policy for grados table

  1. Security
    - Drop existing problematic UPDATE policy
    - Create new UPDATE policy for admin users
    - Ensure both USING and WITH CHECK clauses are properly configured
    - Allow updates for authenticated admin users only

  2. Changes
    - Remove existing "Admins can update grados" policy
    - Create new policy with correct syntax for admin email verification
    - Use proper auth.email() function and LIKE operator
*/

-- Drop the existing problematic UPDATE policy
DROP POLICY IF EXISTS "Admins can update grados" ON grados;
DROP POLICY IF EXISTS "Admin users can update grados" ON grados;

-- Create a new UPDATE policy for admin users
CREATE POLICY "Admin users can update grados"
  ON grados
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text, 
      'administrador@lospinos.edu'::text, 
      'director@lospinos.edu'::text, 
      'antoniogamez@gmail.com'::text
    ]) OR auth.email() LIKE '%admin%'
  )
  WITH CHECK (
    auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text, 
      'administrador@lospinos.edu'::text, 
      'director@lospinos.edu'::text, 
      'antoniogamez@gmail.com'::text
    ]) OR auth.email() LIKE '%admin%'
  );