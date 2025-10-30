/*
  # Add family discount configuration

  1. Changes
    - Add descuento_tercer_hijo column to configuracion_precios table
    - Add descuento_aplicado column to comedor_inscripciones table to track applied discount
    - This column stores the percentage discount (0-100) applied to third child and beyond

  2. Logic
    - Families with 3 or more children get a discount on the 3rd child and beyond
    - The two most expensive subscriptions are kept at full price
    - Remaining subscriptions get the configured discount percentage
*/

-- Add descuento_tercer_hijo to configuracion_precios if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_precios' AND column_name = 'descuento_tercer_hijo'
  ) THEN
    ALTER TABLE configuracion_precios 
    ADD COLUMN descuento_tercer_hijo numeric(5, 2) DEFAULT 0 CHECK (descuento_tercer_hijo >= 0 AND descuento_tercer_hijo <= 100);
  END IF;
END $$;

-- Add descuento_aplicado to comedor_inscripciones if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_inscripciones' AND column_name = 'descuento_aplicado'
  ) THEN
    ALTER TABLE comedor_inscripciones 
    ADD COLUMN descuento_aplicado numeric(5, 2) DEFAULT 0 CHECK (descuento_aplicado >= 0 AND descuento_aplicado <= 100);
  END IF;
END $$;

-- Set default discount to 0 for all existing configurations
UPDATE configuracion_precios 
SET descuento_tercer_hijo = 0 
WHERE descuento_tercer_hijo IS NULL;