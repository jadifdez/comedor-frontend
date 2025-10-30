/*
  # Crear tabla para solicitudes de comida puntual

  1. Nueva tabla
    - `solicitudes_comida`
      - `id` (uuid, primary key)
      - `hijo` (text, nombre del hijo)
      - `hijo_id` (uuid, referencia a hijos)
      - `curso` (text, curso del hijo)
      - `fecha` (text, fecha específica DD/MM/YYYY)
      - `fecha_creacion` (timestamp)
      - `user_id` (uuid, referencia al usuario)
      - `estado` (text, estado de la solicitud: 'pendiente', 'aprobada', 'rechazada')

  2. Seguridad
    - Habilitar RLS en la tabla `solicitudes_comida`
    - Añadir política para que los padres puedan gestionar sus propias solicitudes
*/

CREATE TABLE IF NOT EXISTS solicitudes_comida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijo text NOT NULL,
  hijo_id uuid NOT NULL REFERENCES hijos(id) ON DELETE CASCADE,
  curso text NOT NULL,
  fecha text NOT NULL,
  fecha_creacion timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'))
);

ALTER TABLE solicitudes_comida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Padres can manage solicitudes of their hijos"
  ON solicitudes_comida
  FOR ALL
  TO authenticated
  USING (hijo_id IN (
    SELECT h.id
    FROM hijos h
    JOIN padres p ON h.padre_id = p.id
    WHERE p.email = auth.email()
  ))
  WITH CHECK (hijo_id IN (
    SELECT h.id
    FROM hijos h
    JOIN padres p ON h.padre_id = p.id
    WHERE p.email = auth.email()
  ));