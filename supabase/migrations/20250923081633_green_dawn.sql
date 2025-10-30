/*
  # Asegurar datos de prueba para padres e hijos

  1. Datos de Prueba
    - Inserta padres de ejemplo si no existen
    - Inserta hijos asociados a cada padre
    - Usa UPSERT para evitar duplicados

  2. Padres incluidos
    - maria.garcia@email.com (María García)
    - juan.lopez@email.com (Juan López)  
    - ana.martinez@email.com (Ana Martínez)

  3. Hijos asociados
    - Cada padre tiene 1-2 hijos con nombre y curso
*/

-- Insertar padres de prueba (solo si no existen)
INSERT INTO padres (email, nombre, telefono, activo) VALUES
  ('maria.garcia@email.com', 'María García', '666123456', true),
  ('juan.lopez@email.com', 'Juan López', '666234567', true),
  ('ana.martinez@email.com', 'Ana Martínez', '666345678', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar hijos de prueba (solo si no existen)
INSERT INTO hijos (nombre, curso, padre_id, activo) 
SELECT 'Ana García López', '3º Primaria', p.id, true
FROM padres p 
WHERE p.email = 'maria.garcia@email.com'
AND NOT EXISTS (
  SELECT 1 FROM hijos h 
  WHERE h.nombre = 'Ana García López' AND h.padre_id = p.id
);

INSERT INTO hijos (nombre, curso, padre_id, activo) 
SELECT 'Carlos García López', '5º Primaria', p.id, true
FROM padres p 
WHERE p.email = 'maria.garcia@email.com'
AND NOT EXISTS (
  SELECT 1 FROM hijos h 
  WHERE h.nombre = 'Carlos García López' AND h.padre_id = p.id
);

INSERT INTO hijos (nombre, curso, padre_id, activo) 
SELECT 'Lucía López Fernández', '2º Primaria', p.id, true
FROM padres p 
WHERE p.email = 'juan.lopez@email.com'
AND NOT EXISTS (
  SELECT 1 FROM hijos h 
  WHERE h.nombre = 'Lucía López Fernández' AND h.padre_id = p.id
);

INSERT INTO hijos (nombre, curso, padre_id, activo) 
SELECT 'Diego López Fernández', '4º Primaria', p.id, true
FROM padres p 
WHERE p.email = 'juan.lopez@email.com'
AND NOT EXISTS (
  SELECT 1 FROM hijos h 
  WHERE h.nombre = 'Diego López Fernández' AND h.padre_id = p.id
);

INSERT INTO hijos (nombre, curso, padre_id, activo) 
SELECT 'Sofía Martínez Ruiz', '1º Primaria', p.id, true
FROM padres p 
WHERE p.email = 'ana.martinez@email.com'
AND NOT EXISTS (
  SELECT 1 FROM hijos h 
  WHERE h.nombre = 'Sofía Martínez Ruiz' AND h.padre_id = p.id
);