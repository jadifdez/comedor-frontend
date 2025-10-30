/*
  # Rename comedor tables to new naming convention

  1. Table Renames
    - `bajas_comedor` → `comedor_bajas`
    - `elecciones_menu` → `comedor_menupersonalizado`
    - `enfermedades` → `comedor_dietablanda`
    - `inscripciones_comedor` → `comedor_asistencia`

  2. Updates
    - All foreign key constraints will be automatically updated
    - All indexes will be automatically updated
    - All triggers will be automatically updated
    - All RLS policies will be automatically updated
*/

-- Rename bajas_comedor to comedor_bajas
ALTER TABLE bajas_comedor RENAME TO comedor_bajas;

-- Rename elecciones_menu to comedor_menupersonalizado
ALTER TABLE elecciones_menu RENAME TO comedor_menupersonalizado;

-- Rename enfermedades to comedor_dietablanda
ALTER TABLE enfermedades RENAME TO comedor_dietablanda;

-- Rename inscripciones_comedor to comedor_asistencia
ALTER TABLE inscripciones_comedor RENAME TO comedor_asistencia;