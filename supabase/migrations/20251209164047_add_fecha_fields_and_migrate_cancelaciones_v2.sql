/*
  # Add Date Fields to Bajas and Migrate Cancelaciones (Fixed)

  ## Summary
  This migration adds date range fields to comedor_bajas to support 
  specific-date absences, then migrates all records from 
  comedor_cancelaciones_ultimo_momento.

  ## Changes
  1. Add Missing Fields to comedor_bajas
    - `fecha_inicio` (date, nullable) - Start date of absence
    - `fecha_fin` (date, nullable) - End date of absence  
    - `motivo` (text, nullable) - Reason for absence

  2. Migrate Data
    - Copy all records from comedor_cancelaciones_ultimo_momento
    - Map fields appropriately:
      - fecha → fecha_inicio AND fecha_fin (same date)
      - hijo_id → hijo_id
      - padre_id → padre_id
      - motivo → motivo
      - cancelado_por → user_id
      - created_at → fecha_creacion
      - dias → empty array (required field)

  ## Notes
  - The original table comedor_cancelaciones_ultimo_momento is NOT deleted
  - Existing records in comedor_bajas are not affected
  - Migration is idempotent
*/

-- Add fecha_inicio, fecha_fin, and motivo to comedor_bajas if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_bajas' AND column_name = 'fecha_inicio'
  ) THEN
    ALTER TABLE comedor_bajas ADD COLUMN fecha_inicio date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_bajas' AND column_name = 'fecha_fin'
  ) THEN
    ALTER TABLE comedor_bajas ADD COLUMN fecha_fin date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_bajas' AND column_name = 'motivo'
  ) THEN
    ALTER TABLE comedor_bajas ADD COLUMN motivo text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comedor_bajas_fecha_inicio 
  ON comedor_bajas(fecha_inicio) WHERE fecha_inicio IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_comedor_bajas_fecha_fin 
  ON comedor_bajas(fecha_fin) WHERE fecha_fin IS NOT NULL;

-- Migrate records from comedor_cancelaciones_ultimo_momento to comedor_bajas
-- Only insert if they don't already exist
INSERT INTO comedor_bajas (
  hijo_id,
  padre_id,
  fecha_inicio,
  fecha_fin,
  motivo,
  user_id,
  fecha_creacion,
  hijo,
  dias,
  curso
)
SELECT 
  c.hijo_id,
  c.padre_id,
  c.fecha AS fecha_inicio,
  c.fecha AS fecha_fin,
  COALESCE(c.motivo, 'Cancelación último momento migrada') AS motivo,
  c.cancelado_por AS user_id,
  c.created_at AS fecha_creacion,
  COALESCE(h.nombre, p.nombre, 'Desconocido') AS hijo,
  ARRAY[]::text[] AS dias,
  CASE 
    WHEN h.id IS NOT NULL THEN (SELECT nombre FROM grados WHERE id = h.grado_id)
    ELSE 'Personal'
  END AS curso
FROM comedor_cancelaciones_ultimo_momento c
LEFT JOIN hijos h ON c.hijo_id = h.id
LEFT JOIN padres p ON c.padre_id = p.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM comedor_bajas b 
  WHERE b.fecha_inicio = c.fecha 
    AND b.fecha_fin = c.fecha
    AND (
      (b.hijo_id = c.hijo_id AND c.hijo_id IS NOT NULL) OR
      (b.padre_id = c.padre_id AND c.padre_id IS NOT NULL)
    )
);
