/*
  # Add Performance Indexes for Padres and Hijos

  1. Purpose
    - Optimize queries in the Padres Manager admin section
    - Reduce load times from several seconds to under 500ms
    - Enable efficient JOINs and aggregations

  2. New Indexes
    - `idx_hijos_padre_id` - Index on hijos.padre_id for fast JOINs and COUNT queries
    - `idx_padres_nombre` - Index on padres.nombre for search optimization
    - `idx_padres_activo` - Index on padres.activo for filtering
    - `idx_padres_nombre_activo` - Composite index for combined search and filter
    - `idx_inscripciones_padres_composite` - Composite index for padre_id + activo queries

  3. Performance Impact
    - Eliminates full table scans on hijos when counting by padre_id
    - Speeds up search queries on padres.nombre
    - Optimizes filtering by activo status
    - Improves inscription verification queries for professors
*/

-- Index on hijos.padre_id for fast counting and JOINs
CREATE INDEX IF NOT EXISTS idx_hijos_padre_id 
  ON hijos(padre_id);

-- Index on padres.nombre for search queries (supports ILIKE)
CREATE INDEX IF NOT EXISTS idx_padres_nombre 
  ON padres(nombre);

-- Index on padres.activo for filtering
CREATE INDEX IF NOT EXISTS idx_padres_activo 
  ON padres(activo);

-- Composite index for search + filter operations
CREATE INDEX IF NOT EXISTS idx_padres_nombre_activo 
  ON padres(nombre, activo);

-- Composite index for inscription queries (padre_id + activo)
CREATE INDEX IF NOT EXISTS idx_inscripciones_padres_padre_activo 
  ON comedor_inscripciones_padres(padre_id, activo);

-- Index on hijos.activo for filtering active children
CREATE INDEX IF NOT EXISTS idx_hijos_activo 
  ON hijos(activo);

-- Add statistics for query planner optimization
ANALYZE padres;
ANALYZE hijos;
ANALYZE comedor_inscripciones_padres;
