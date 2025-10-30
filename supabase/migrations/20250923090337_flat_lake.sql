/*
  # Habilitar menú para Carlos

  1. Changes
    - Update grado "1º de ESO" to enable menu selection
    - This will allow Carlos to appear in menu selection

  2. Security
    - No security changes needed, just updating existing data
*/

-- Update the grade "1º de ESO" to enable menu selection
UPDATE grados 
SET tiene_opcion_menu = true 
WHERE nombre = '1º de ESO';