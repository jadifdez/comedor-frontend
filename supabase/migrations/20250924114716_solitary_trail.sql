/*
  # Fix admin access to hijos table

  1. Security
    - Add RLS policies for admin users to access hijos table
    - Allow admins to read, create, update and delete hijos records
*/

-- Add policy for admins to read all hijos
CREATE POLICY "Admins can read all hijos"
  ON hijos
  FOR SELECT
  TO authenticated
  USING (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR (auth.email() ~~ '%admin%'::text)
  );

-- Add policy for admins to insert hijos
CREATE POLICY "Admins can insert hijos"
  ON hijos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR (auth.email() ~~ '%admin%'::text)
  );

-- Add policy for admins to update hijos
CREATE POLICY "Admins can update hijos"
  ON hijos
  FOR UPDATE
  TO authenticated
  USING (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR (auth.email() ~~ '%admin%'::text)
  )
  WITH CHECK (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR (auth.email() ~~ '%admin%'::text)
  );

-- Add policy for admins to delete hijos
CREATE POLICY "Admins can delete hijos"
  ON hijos
  FOR DELETE
  TO authenticated
  USING (
    (auth.email() = ANY (ARRAY['admin@lospinos.edu'::text, 'administrador@lospinos.edu'::text, 'director@lospinos.edu'::text, 'antoniogamez@gmail.com'::text])) 
    OR (auth.email() ~~ '%admin%'::text)
  );