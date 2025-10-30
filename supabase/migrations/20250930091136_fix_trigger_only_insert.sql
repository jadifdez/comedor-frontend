/*
  # Fix trigger to only calculate prices on INSERT

  1. Changes
    - Modify trigger to ONLY execute on INSERT, not on UPDATE
    - This ensures existing inscriptions keep their historical prices
    - Only new inscriptions get the current configured prices and discounts

  2. Rationale
    - Prices are historical data and should not change retroactively
    - When admins change prices, it should only affect new inscriptions
    - Existing subscriptions maintain their original pricing
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS set_inscripcion_precio ON comedor_inscripciones;

-- Recreate trigger to ONLY run on INSERT
CREATE TRIGGER set_inscripcion_precio
  BEFORE INSERT ON comedor_inscripciones
  FOR EACH ROW
  EXECUTE FUNCTION calculate_inscripcion_precio();