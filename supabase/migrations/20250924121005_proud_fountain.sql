/*
  # Fix RLS UPDATE policy for grados table

  1. Security Policy Fix
    - Drop existing problematic UPDATE policy
    - Create new UPDATE policy with correct syntax
    - Ensure both USING and WITH CHECK clauses work properly
    
  2. Admin Access
    - Allow updates for specific admin emails
    - Support wildcard admin email patterns
    - Maintain security while enabling functionality
*/

-- Drop the existing UPDATE policy that's causing issues
DROP POLICY IF EXISTS "Admin users can update grados" ON grados;

-- Create a new UPDATE policy with proper syntax
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
    ])) OR 
    (auth.email() LIKE '%admin%')
  )
  WITH CHECK (
    (auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text, 
      'administrador@lospinos.edu'::text, 
      'director@lospinos.edu'::text, 
      'antoniogamez@gmail.com'::text
    ])) OR 
    (auth.email() LIKE '%admin%')
  );