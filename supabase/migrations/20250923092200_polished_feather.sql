/*
  # Auto-aprobar solicitudes de dieta blanda

  1. Changes
    - Cambiar el estado por defecto de 'pendiente' a 'aprobada' para solicitudes de dieta blanda
    - Las solicitudes se aprueban automáticamente al crearlas
*/

-- Cambiar el valor por defecto del estado a 'aprobada'
ALTER TABLE enfermedades ALTER COLUMN estado SET DEFAULT 'aprobada';