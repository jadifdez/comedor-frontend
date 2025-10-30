/*
  # Agregar descuento por asistencia del 80%

  1. Modificaciones
    - Agregar columna `descuento_asistencia_80` a la tabla `configuracion_precios`
      - Tipo: numeric(5, 2)
      - Valor por defecto: 18.00 (18%)
      - Restricción: debe ser entre 0 y 100

  2. Datos iniciales
    - Actualizar las configuraciones existentes con el valor por defecto de 18%

  3. Descripción
    - Este descuento se aplica automáticamente cuando un alumno asiste al 80% o más de las comidas del mes
    - El 80% se calcula sobre los días laborables del mes (lunes a viernes - días festivos)
    - El descuento se aplica sobre el total de la factura del mes
*/

-- Agregar columna de descuento por asistencia del 80%
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_precios' AND column_name = 'descuento_asistencia_80'
  ) THEN
    ALTER TABLE configuracion_precios 
    ADD COLUMN descuento_asistencia_80 numeric(5, 2) DEFAULT 18.00 CHECK (descuento_asistencia_80 >= 0 AND descuento_asistencia_80 <= 100);
  END IF;
END $$;

-- Actualizar configuraciones existentes con el valor por defecto
UPDATE configuracion_precios
SET descuento_asistencia_80 = 18.00
WHERE descuento_asistencia_80 IS NULL;
