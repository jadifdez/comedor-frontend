/*
  # Insertar datos de prueba

  1. Datos de prueba
    - Insertar padres de ejemplo
    - Insertar hijos asociados a cada padre
  
  2. Seguridad
    - Los datos respetan las políticas RLS existentes
*/

-- Insertar padres de prueba
INSERT INTO padres (email, nombre, telefono, activo) VALUES
  ('maria.garcia@email.com', 'María García', '666123456', true),
  ('juan.lopez@email.com', 'Juan López', '666789012', true),
  ('ana.martinez@email.com', 'Ana Martínez', '666345678', true)
ON CONFLICT (email) DO NOTHING;

-- Insertar hijos asociados a cada padre
INSERT INTO hijos (nombre, curso, padre_id, activo) VALUES
  -- Hijos de María García
  ('Ana García López', '3º Primaria', (SELECT id FROM padres WHERE email = 'maria.garcia@email.com'), true),
  ('Carlos García López', '5º Primaria', (SELECT id FROM padres WHERE email = 'maria.garcia@email.com'), true),
  
  -- Hijos de Juan López  
  ('Lucía López Fernández', '2º Primaria', (SELECT id FROM padres WHERE email = 'juan.lopez@email.com'), true),
  ('Diego López Fernández', '4º Primaria', (SELECT id FROM padres WHERE email = 'juan.lopez@email.com'), true),
  
  -- Hija de Ana Martínez
  ('Sofía Martínez Ruiz', '1º Primaria', (SELECT id FROM padres WHERE email = 'ana.martinez@email.com'), true)
ON CONFLICT DO NOTHING;