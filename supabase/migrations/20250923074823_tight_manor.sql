/*
  # Crear tabla de bajas de comedor

  1. New Tables
    - `bajas_comedor`
      - `id` (uuid, primary key)
      - `hijo` (text, nombre del hijo)
      - `dias` (text array, días de la semana)
      - `fecha_creacion` (timestamp)
      - `user_id` (uuid, referencia al usuario autenticado)

  2. Security
    - Enable RLS on `bajas_comedor` table
    - Add policy for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS bajas_comedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo text NOT NULL,
  dias text[] NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE bajas_comedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bajas"
  ON bajas_comedor
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);