/*
  # Agregar campo codigofacturacion a tabla padres

  1. Cambios
    - Agregar columna `codigofacturacion` (text, nullable) a la tabla `padres`
    - Este campo permite identificar al padre en sistemas de facturación externos
    - Es opcional y puede ser ingresado manualmente por los administradores
  
  2. Notas
    - El campo es nullable para mantener compatibilidad con datos existentes
    - Similar al campo codigofacturacion que ya existe en la tabla hijos
    - Se usa principalmente para personal del colegio que consume comedor
*/

-- Add codigofacturacion column to padres table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'padres' AND column_name = 'codigofacturacion'
  ) THEN
    ALTER TABLE padres ADD COLUMN codigofacturacion text;
  END IF;
END $$;