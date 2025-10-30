/*
  # Fix RLS policy for grados table admin updates

  1. Security Policy Fix
    - Drop existing problematic UPDATE policy for grados table
    - Create new UPDATE policy with proper admin email verification
    - Allow admin users to update grado records (status, menu options, etc.)

  2. Admin Access Control
    - Specific admin emails: admin@lospinos.edu, administrador@lospinos.edu, director@lospinos.edu, antoniogamez@gmail.com
    - Wildcard support for emails containing 'admin'
    - Both USING and WITH CHECK clauses for complete access control
*/

-- Drop existing UPDATE policy that might be causing issues
DROP POLICY IF EXISTS "Admin users can update grados" ON grados;

-- Create new UPDATE policy with proper admin verification
CREATE POLICY "Admin users can update grados"
  ON grados
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN ('admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com')
    OR auth.email() LIKE '%admin%'
  )
  WITH CHECK (
    auth.email() IN ('admin@lospinos.edu', 'administrador@lospinos.edu', 'director@lospinos.edu', 'antoniogamez@gmail.com')
    OR auth.email() LIKE '%admin%'
  );