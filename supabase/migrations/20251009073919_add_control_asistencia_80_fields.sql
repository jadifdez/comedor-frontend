/*
  # Sistema de Control de Asistencia del 80% - Parte 1: Campos de Control

  ## Descripción General
  Este sistema implementa el control mensual de asistencia del 80% para aplicar 
  penalizaciones en el precio del comedor cuando los alumnos no cumplan con el 
  mínimo de asistencia requerido.

  ## Cambios en Tablas Existentes
  
  ### Tabla `comedor_inscripciones`
  Se añaden los siguientes campos:
  - `perdio_descuento_mes_anterior` (boolean) - Indica si el alumno perdió el descuento 
    el mes anterior por no cumplir el 80% de asistencia
  - `mes_perdida_descuento` (text) - Registra el mes específico en formato YYYY-MM 
    cuando se perdió el descuento
  - `precio_penalizado` (numeric) - Almacena el precio con penalización aplicada (9.15€)
    cuando se pierde el descuento

  ## Reglas de Negocio
  1. Solo afecta a alumnos regulares (NO a hijos de personal del colegio)
  2. El control se aplica cada mes de forma independiente
  3. Si no cumple el 80%, se aplica precio de 9.15€ a TODOS los días del mes siguiente
  4. Si recupera el 80%, vuelve a su precio original con descuentos aplicables
  5. Los días festivos, bajas e invitaciones NO cuentan como faltas

  ## Índices
  Se crean índices para optimizar las consultas de control mensual
*/

-- Añadir campos de control de asistencia a comedor_inscripciones
DO $$
BEGIN
  -- Campo para marcar si perdió el descuento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_inscripciones' AND column_name = 'perdio_descuento_mes_anterior'
  ) THEN
    ALTER TABLE comedor_inscripciones 
    ADD COLUMN perdio_descuento_mes_anterior boolean DEFAULT false NOT NULL;
  END IF;

  -- Campo para registrar el mes de pérdida
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_inscripciones' AND column_name = 'mes_perdida_descuento'
  ) THEN
    ALTER TABLE comedor_inscripciones 
    ADD COLUMN mes_perdida_descuento text;
  END IF;

  -- Campo para almacenar el precio con penalización
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comedor_inscripciones' AND column_name = 'precio_penalizado'
  ) THEN
    ALTER TABLE comedor_inscripciones 
    ADD COLUMN precio_penalizado numeric(10,2);
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento de las consultas de control
CREATE INDEX IF NOT EXISTS idx_comedor_inscripciones_perdio_descuento 
  ON comedor_inscripciones(perdio_descuento_mes_anterior) 
  WHERE perdio_descuento_mes_anterior = true;

CREATE INDEX IF NOT EXISTS idx_comedor_inscripciones_mes_perdida 
  ON comedor_inscripciones(mes_perdida_descuento) 
  WHERE mes_perdida_descuento IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN comedor_inscripciones.perdio_descuento_mes_anterior IS 
  'Indica si el alumno perdió el descuento por no cumplir el 80% de asistencia el mes anterior';

COMMENT ON COLUMN comedor_inscripciones.mes_perdida_descuento IS 
  'Mes en formato YYYY-MM cuando se perdió el descuento por última vez';

COMMENT ON COLUMN comedor_inscripciones.precio_penalizado IS 
  'Precio aplicado cuando se pierde el descuento (9.15€ por día)';