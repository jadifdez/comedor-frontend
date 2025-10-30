/*
  # Unificar precios de alumnos a un solo precio de 9.15€
  
  ## Resumen
  Este cambio elimina la diferenciación de precios entre alumnos que asisten 1-3 días
  y alumnos que asisten 4-5 días. Todos los alumnos pagarán un precio único de 9.15€
  por día, independientemente del número de días de asistencia.
  
  ## Cambios en `configuracion_precios`
  1. Eliminar la entrada "Precio 4-5 días" (7.50€)
  2. Actualizar la entrada "Precio 1-3 días" para cubrir el rango completo 1-5 días
     - Cambiar dias_max de 3 a 5
     - Actualizar nombre a "Precio Alumnos"
  
  ## Impacto
  - Los precios especiales (precio_hijo_personal y precio_adulto) NO se ven afectados
  - Solo afecta a alumnos regulares
  - Las inscripciones existentes se actualizarán en una migración posterior
  
  ## Notas
  - Esta migración NO actualiza inscripciones existentes (se hará en siguiente paso)
  - Se mantiene compatibilidad con triggers y funciones existentes
*/

-- Eliminar la configuración de precio para 4-5 días (7.50€)
DELETE FROM configuracion_precios 
WHERE dias_min = 4 AND dias_max = 5 AND precio = 7.50;

-- Actualizar la configuración de precio 1-3 días para que cubra todo el rango 1-5 días
UPDATE configuracion_precios
SET 
  dias_max = 5,
  nombre = 'Precio Alumnos',
  updated_at = now()
WHERE dias_min = 1 AND dias_max = 3 AND activo = true;
