/*
  # Add multi-day menu option insertion

  1. New RPC Functions
    - `admin_insert_opcion_principal_multi_dias` - Allows inserting a menu option for multiple days at once
      - Accepts: new_nombre (text), new_dias_semana (integer array), new_orden (integer), new_activo (boolean)
      - Creates one row per day selected with the same name, order, and active status
      - Uses security definer to bypass RLS
      - Validates that all days are between 1-5 (Monday-Friday)

  2. Purpose
    - Streamlines menu option creation by allowing bulk insertion across multiple weekdays
    - Example: Create "FILETE RUSO" for Monday through Friday in a single operation
    - Maintains data consistency across days while reducing manual repetition
*/

-- Create function to insert menu option for multiple days at once
CREATE OR REPLACE FUNCTION admin_insert_opcion_principal_multi_dias(
  new_nombre text,
  new_dias_semana integer[],
  new_orden integer,
  new_activo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dia integer;
BEGIN
  -- Validate that all days are between 1 and 5
  FOREACH dia IN ARRAY new_dias_semana
  LOOP
    IF dia < 1 OR dia > 5 THEN
      RAISE EXCEPTION 'Invalid day of week: %. Must be between 1 (Monday) and 5 (Friday)', dia;
    END IF;
  END LOOP;

  -- Insert one row per selected day
  FOREACH dia IN ARRAY new_dias_semana
  LOOP
    INSERT INTO opciones_menu_principal (nombre, dia_semana, orden, activo)
    VALUES (new_nombre, dia, new_orden, new_activo);
  END LOOP;
END;
$$;