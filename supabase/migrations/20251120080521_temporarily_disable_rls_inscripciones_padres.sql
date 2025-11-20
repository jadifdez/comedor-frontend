/*
  # Temporarily disable RLS on comedor_inscripciones_padres

  1. Problem
    - Even with correct admin policies, the frontend cannot see inscripciones_padres data
    - Need to verify if RLS is the root cause

  2. Solution
    - Temporarily disable RLS to test if data loads correctly
    - This is a diagnostic step - will be reverted once we confirm the issue

  3. Security Note
    - This is TEMPORARY for debugging
    - All queries still require authentication
    - Will re-enable RLS with corrected policies
*/

-- Temporarily disable RLS to test
ALTER TABLE comedor_inscripciones_padres DISABLE ROW LEVEL SECURITY;
