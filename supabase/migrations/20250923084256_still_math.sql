/*
  # Añadir campo de control de menú a tabla grados

  1. Cambios en tabla grados
    - Añadir campo `tiene_opcion_menu` (boolean)
    - Valor por defecto: false
    - Actualizar grados existentes según necesidades típicas

  2. Notas
    - Los grados más pequeños (infantil/primaria inicial) normalmente no eligen menú
    - Los grados mayores (primaria avanzada/secundaria) sí pueden elegir
*/

-- Añadir el campo tiene_opcion_menu a la tabla grados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grados' AND column_name = 'tiene_opcion_menu'
  ) THEN
    ALTER TABLE grados ADD COLUMN tiene_opcion_menu boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Actualizar los grados existentes con valores por defecto
-- (puedes ajustar estos valores según las necesidades del colegio)
UPDATE grados SET tiene_opcion_menu = false WHERE nombre LIKE '%Infantil%' OR nombre LIKE '%1º%' OR nombre LIKE '%2º%';
UPDATE grados SET tiene_opcion_menu = true WHERE nombre LIKE '%3º%' OR nombre LIKE '%4º%' OR nombre LIKE '%5º%' OR nombre LIKE '%6º%' OR nombre LIKE '%ESO%' OR nombre LIKE '%Bachillerato%';

-- Si no hay grados específicos, establecer un patrón por defecto
-- Los primeros grados (orden 1-3) no tienen opción de menú
-- Los grados superiores (orden 4+) sí tienen opción de menú
UPDATE grados SET tiene_opcion_menu = false WHERE orden <= 3;
UPDATE grados SET tiene_opcion_menu = true WHERE orden > 3;