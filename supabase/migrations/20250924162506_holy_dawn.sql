/*
  # Create días festivos table

  1. New Tables
    - `dias_festivos`
      - `id` (uuid, primary key)
      - `fecha` (date, unique) - The festive date
      - `nombre` (text) - Name/description of the festive day
      - `activo` (boolean, default true) - Whether the festive day is active
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `dias_festivos` table
    - Add policies for admin users to manage festive days
    - Add policy for authenticated users to read active festive days
    - Add policy for anonymous users to read active festive days (for public calendar features)
*/

-- Create the dias_festivos table
CREATE TABLE IF NOT EXISTS public.dias_festivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date UNIQUE NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dias_festivos ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to manage all festive days
CREATE POLICY "Admin users can manage dias_festivos"
  ON public.dias_festivos
  FOR ALL
  TO authenticated
  USING (
    auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text,
      'administrador@lospinos.edu'::text,
      'director@lospinos.edu'::text,
      'antoniogamez@gmail.com'::text
    ]) OR auth.email() LIKE '%admin%'::text
  )
  WITH CHECK (
    auth.email() = ANY (ARRAY[
      'admin@lospinos.edu'::text,
      'administrador@lospinos.edu'::text,
      'director@lospinos.edu'::text,
      'antoniogamez@gmail.com'::text
    ]) OR auth.email() LIKE '%admin%'::text
  );

-- Policy for authenticated users to read active festive days
CREATE POLICY "Authenticated users can read active dias_festivos"
  ON public.dias_festivos
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Policy for anonymous users to read active festive days (for public features)
CREATE POLICY "Anonymous users can read active dias_festivos"
  ON public.dias_festivos
  FOR SELECT
  TO anon
  USING (activo = true);

-- Create index for better performance on fecha queries
CREATE INDEX IF NOT EXISTS idx_dias_festivos_fecha ON public.dias_festivos(fecha);
CREATE INDEX IF NOT EXISTS idx_dias_festivos_activo ON public.dias_festivos(activo);