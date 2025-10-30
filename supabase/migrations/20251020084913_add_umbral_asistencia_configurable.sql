/*
  # Agregar umbral de asistencia configurable

  1. Modificaciones
    - Agregar columna `umbral_asistencia_descuento` a la tabla `configuracion_precios`
      - Tipo: numeric(5, 2)
      - Valor por defecto: 80.00 (80%)
      - Restricción: debe ser entre 0 y 100

  2. Datos iniciales
    - Actualizar las configuraciones existentes con el valor por defecto de 80%

  3. Descripción
    - Este campo permite a los administradores configurar el porcentaje mínimo de asistencia
      requerido para aplicar el descuento por asistencia
    - Por defecto es 80%, pero puede ajustarse según las necesidades del colegio
*/

-- Agregar columna de umbral de asistencia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_precios' AND column_name = 'umbral_asistencia_descuento'
  ) THEN
    ALTER TABLE configuracion_precios 
    ADD COLUMN umbral_asistencia_descuento numeric(5, 2) DEFAULT 80.00 CHECK (umbral_asistencia_descuento >= 0 AND umbral_asistencia_descuento <= 100);
  END IF;
END $$;

-- Actualizar configuraciones existentes con el valor por defecto
UPDATE configuracion_precios
SET umbral_asistencia_descuento = 80.00
WHERE umbral_asistencia_descuento IS NULL;
