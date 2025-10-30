/*
  # Add admin policies for padres table

  1. Security
    - Add policy for admins to read all padres
    - Add policy for admins to insert new padres
    - Add policy for admins to update existing padres
    - Add policy for admins to delete padres
*/

-- Allow admins to read all padres
CREATE POLICY "Admins can read all padres"
  ON padres
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (
      'admin@lospinos.edu',
      'administrador@lospinos.edu', 
      'director@lospinos.edu',
      'antoniogamez@gmail.com'
    ) OR 
    auth.email() LIKE '%admin%'
  );

-- Allow admins to insert new padres
CREATE POLICY "Admins can insert padres"
  ON padres
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() IN (
      'admin@lospinos.edu',
      'administrador@lospinos.edu',
      'director@lospinos.edu', 
      'antoniogamez@gmail.com'
    ) OR
    auth.email() LIKE '%admin%'
  );

-- Allow admins to update padres
CREATE POLICY "Admins can update padres"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN (
      'admin@lospinos.edu',
      'administrador@lospinos.edu',
      'director@lospinos.edu',
      'antoniogamez@gmail.com'
    ) OR
    auth.email() LIKE '%admin%'
  );

-- Allow admins to delete padres
CREATE POLICY "Admins can delete padres"
  ON padres
  FOR DELETE
  TO authenticated
  USING (
    auth.email() IN (
      'admin@lospinos.edu',
      'administrador@lospinos.edu',
      'director@lospinos.edu',
      'antoniogamez@gmail.com'
    ) OR
    auth.email() LIKE '%admin%'
  );