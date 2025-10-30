/*
  # Añadir hijo de secundaria para María García

  1. Nuevos datos
    - Añadir grado "1º de ESO" (secundaria)
    - Añadir hijo "Carlos García" en 1º de ESO para María García
  
  2. Configuración
    - El grado de secundaria tendrá opción de elegir menú (tiene_opcion_menu = true)
    - Se asigna al padre existente María García
*/

-- Añadir grado de secundaria si no existe
INSERT INTO grados (nombre, orden, activo, tiene_opcion_menu) 
VALUES ('1º de ESO', 7, true, true)
ON CONFLICT (nombre) DO NOTHING;

-- Obtener el ID del grado de secundaria
DO $$
DECLARE
    grado_secundaria_id uuid;
    maria_garcia_id uuid;
BEGIN
    -- Obtener ID del grado de secundaria
    SELECT id INTO grado_secundaria_id 
    FROM grados 
    WHERE nombre = '1º de ESO';
    
    -- Obtener ID de María García
    SELECT id INTO maria_garcia_id 
    FROM padres 
    WHERE email = 'maria.garcia@email.com';
    
    -- Añadir hijo de secundaria para María García si existe el padre
    IF maria_garcia_id IS NOT NULL AND grado_secundaria_id IS NOT NULL THEN
        INSERT INTO hijos (nombre, padre_id, grado_id, activo)
        VALUES ('Carlos García', maria_garcia_id, grado_secundaria_id, true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;