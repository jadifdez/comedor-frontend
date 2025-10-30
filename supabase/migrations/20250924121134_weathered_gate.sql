/*
  # Fix RLS policy for grados table admin updates

  1. Security
    - Drop existing problematic UPDATE policy for grados
    - Create new UPDATE policy that properly allows admin users
    - Use correct email() function syntax for Supabase RLS
    - Allow both specific admin emails and emails containing 'admin'

  2. Changes
    - Fixes RLS policy violation when admins try to update grados
    - Maintains security by only allowing authenticated admin users
    - Uses proper WITH CHECK clause for update operations
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Admins can update grados" ON grados;

-- Create a new policy with correct syntax
CREATE POLICY "Admins can update grados"
  ON grados
  FOR UPDATE
  TO authenticated
  USING (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR 
    (auth.email() LIKE '%admin%')
  )
  WITH CHECK (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR 
    (auth.email() LIKE '%admin%')
  );