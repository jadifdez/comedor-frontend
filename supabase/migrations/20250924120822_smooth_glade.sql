/*
  # Fix RLS policy for grados table updates

  1. Security Changes
    - Drop existing UPDATE policy for grados table
    - Create new UPDATE policy that properly allows admin users to modify grados
    - Ensure policy uses correct email() function and admin email list

  2. Changes
    - Updated UPDATE policy to match the working patterns from other admin policies
    - Uses proper email() function syntax
    - Includes all admin emails and wildcard pattern for admin emails
*/

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Admin users can update grados" ON grados;

-- Create new UPDATE policy with correct syntax
CREATE POLICY "Admin users can update grados"
  ON grados
  FOR UPDATE
  TO authenticated
  USING (
    (auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text, 
      'administrador@lospinos.edu'::text, 
      'director@lospinos.edu'::text, 
      'antoniogamez@gmail.com'::text
    ])) OR (auth.email() ~~ '%admin%'::text)
  )
  WITH CHECK (
    (auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text, 
      'administrador@lospinos.edu'::text, 
      'director@lospinos.edu'::text, 
      'antoniogamez@gmail.com'::text
    ])) OR (auth.email() ~~ '%admin%'::text)
  );