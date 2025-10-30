/*
  # Eliminar función obsoleta calcular_precio_diario
  
  ## Resumen
  La función calcular_precio_diario() tenía precios hardcoded (9.15€ y 7.50€) que
  ya no se utilizan. El sistema ahora usa la tabla configuracion_precios de forma
  dinámica a través de los triggers apply_family_discounts() y 
  recalculate_family_discounts_on_update().
  
  ## Cambios
  1. Eliminar la función calcular_precio_diario si existe
  2. Eliminar el trigger update_precio_diario que la llamaba
  
  ## Impacto
  - Esta función ya no se utiliza en el sistema actual
  - Los triggers modernos consultan directamente configuracion_precios
  - No hay impacto en el funcionamiento del sistema
  
  ## Notas
  - Esta es una limpieza de código legacy
  - Los precios ahora se gestionan completamente desde configuracion_precios
*/

-- Eliminar el trigger si existe
DROP TRIGGER IF EXISTS trigger_update_precio_diario ON comedor_inscripciones;

-- Eliminar la función obsoleta
DROP FUNCTION IF EXISTS calcular_precio_diario(integer);

-- Eliminar también el trigger viejo si existe
DROP FUNCTION IF EXISTS update_precio_diario();
