/*
  # Add billing exemption system (exención de facturación)

  1. New Fields
    - Add to `hijos` table:
      - `exento_facturacion` (boolean, default false) - Whether the student is exempt from billing
      - `motivo_exencion` (text, nullable) - Reason for exemption (required when exempt)
      - `fecha_inicio_exencion` (date, nullable) - Start date of exemption (optional, for temporary exemptions)
      - `fecha_fin_exencion` (date, nullable) - End date of exemption (optional, for temporary exemptions)
    
    - Add to `padres` table:
      - `exento_facturacion` (boolean, default false) - Whether the parent's comedor registration is exempt
      - `motivo_exencion` (text, nullable) - Reason for exemption
      - `fecha_inicio_exencion` (date, nullable) - Start date of exemption
      - `fecha_fin_exencion` (date, nullable) - End date of exemption

  2. Important Notes
    - Each entity (hijo/padre) has independent exemption status
    - If hijo is exempt, no billing applies regardless of inscriptions
    - If padre is exempt, only their own comedor registration is exempt (not their children)
    - Exemptions can be permanent (no dates) or temporary (with date range)
    - When exempt, the entity pays 0€, but the theoretical amount is still calculated for reporting
    - Only administrators can modify exemption status

  3. Security
    - RLS policies already restrict modifications to admins only
    - Parents can view their exemption status but cannot modify it

  4. Indexes
    - Create indexes on exemption fields for faster billing calculations
*/

-- Add exemption fields to hijos table
DO $$
BEGIN
  -- exento_facturacion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'hijos'
    AND column_name = 'exento_facturacion'
  ) THEN
    ALTER TABLE hijos 
    ADD COLUMN exento_facturacion boolean DEFAULT false NOT NULL;
  END IF;

  -- motivo_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'hijos'
    AND column_name = 'motivo_exencion'
  ) THEN
    ALTER TABLE hijos 
    ADD COLUMN motivo_exencion text;
  END IF;

  -- fecha_inicio_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'hijos'
    AND column_name = 'fecha_inicio_exencion'
  ) THEN
    ALTER TABLE hijos 
    ADD COLUMN fecha_inicio_exencion date;
  END IF;

  -- fecha_fin_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'hijos'
    AND column_name = 'fecha_fin_exencion'
  ) THEN
    ALTER TABLE hijos 
    ADD COLUMN fecha_fin_exencion date;
  END IF;
END $$;

-- Add exemption fields to padres table
DO $$
BEGIN
  -- exento_facturacion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'padres'
    AND column_name = 'exento_facturacion'
  ) THEN
    ALTER TABLE padres 
    ADD COLUMN exento_facturacion boolean DEFAULT false NOT NULL;
  END IF;

  -- motivo_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'padres'
    AND column_name = 'motivo_exencion'
  ) THEN
    ALTER TABLE padres 
    ADD COLUMN motivo_exencion text;
  END IF;

  -- fecha_inicio_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'padres'
    AND column_name = 'fecha_inicio_exencion'
  ) THEN
    ALTER TABLE padres 
    ADD COLUMN fecha_inicio_exencion date;
  END IF;

  -- fecha_fin_exencion field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'padres'
    AND column_name = 'fecha_fin_exencion'
  ) THEN
    ALTER TABLE padres 
    ADD COLUMN fecha_fin_exencion date;
  END IF;
END $$;

-- Add check constraints to ensure date logic is valid
DO $$
BEGIN
  -- Constraint for hijos: end date must be >= start date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'hijos_fecha_exencion_check'
  ) THEN
    ALTER TABLE hijos 
    ADD CONSTRAINT hijos_fecha_exencion_check 
    CHECK (fecha_fin_exencion IS NULL OR fecha_inicio_exencion IS NULL OR fecha_fin_exencion >= fecha_inicio_exencion);
  END IF;

  -- Constraint for padres: end date must be >= start date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'padres_fecha_exencion_check'
  ) THEN
    ALTER TABLE padres 
    ADD CONSTRAINT padres_fecha_exencion_check 
    CHECK (fecha_fin_exencion IS NULL OR fecha_inicio_exencion IS NULL OR fecha_fin_exencion >= fecha_inicio_exencion);
  END IF;
END $$;

-- Create indexes for faster billing queries
CREATE INDEX IF NOT EXISTS idx_hijos_exento_facturacion 
  ON hijos(exento_facturacion) 
  WHERE exento_facturacion = true;

CREATE INDEX IF NOT EXISTS idx_padres_exento_facturacion 
  ON padres(exento_facturacion) 
  WHERE exento_facturacion = true;

-- Create a helper function to check if exemption is valid for a given date
CREATE OR REPLACE FUNCTION esta_exento_en_fecha(
  exento boolean,
  fecha_inicio date,
  fecha_fin date,
  fecha_consulta date
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If not marked as exempt, return false
  IF NOT exento THEN
    RETURN false;
  END IF;
  
  -- If no date range specified, exemption is permanent
  IF fecha_inicio IS NULL AND fecha_fin IS NULL THEN
    RETURN true;
  END IF;
  
  -- If only start date is specified
  IF fecha_inicio IS NOT NULL AND fecha_fin IS NULL THEN
    RETURN fecha_consulta >= fecha_inicio;
  END IF;
  
  -- If only end date is specified
  IF fecha_inicio IS NULL AND fecha_fin IS NOT NULL THEN
    RETURN fecha_consulta <= fecha_fin;
  END IF;
  
  -- If both dates are specified
  RETURN fecha_consulta >= fecha_inicio AND fecha_consulta <= fecha_fin;
END;
$$;

-- Comment on function
COMMENT ON FUNCTION esta_exento_en_fecha IS 'Helper function to check if an exemption is valid for a given date based on exemption status and date range';
