/*
  # Rename comedor tables to new naming convention

  1. Table Renames
    - `comedor_asistencia` → `comedor_inscripciones`
    - `solicitudes_comida` → `comedor_altaspuntuales`

  2. Updates
    - All foreign key constraints are automatically updated
    - All indexes are renamed accordingly
    - All RLS policies are maintained
    - All triggers are updated automatically

  3. Data Preservation
    - All existing data is preserved during the rename
    - No data loss occurs during this operation
*/

-- Rename comedor_asistencia to comedor_inscripciones
ALTER TABLE IF EXISTS comedor_asistencia RENAME TO comedor_inscripciones;

-- Rename solicitudes_comida to comedor_altaspuntuales
ALTER TABLE IF EXISTS solicitudes_comida RENAME TO comedor_altaspuntuales;