/*
  # TEMPORARY: Disable RLS on padres table for debugging
  
  This is TEMPORARY to confirm the issue is RLS-related.
  DO NOT use in production!
*/

-- Temporarily disable RLS
ALTER TABLE padres DISABLE ROW LEVEL SECURITY;
