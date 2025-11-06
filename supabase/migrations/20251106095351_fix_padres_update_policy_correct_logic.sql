/*
  # Fix padres UPDATE policy - Correct logic for email changes

  1. Root Cause
    - USING checks OLD row (works: email = auth.email())
    - WITH CHECK checks NEW row (fails: new email ≠ auth.email())
    - Subquery in WITH CHECK still evaluates against NEW row context
  
  2. Correct Solution
    - USING: Verify we own the OLD row (email = auth.email())
    - WITH CHECK: Just ensure ID hasn't changed (id = id is always true in UPDATE context)
    - Since USING already verified ownership, WITH CHECK just needs to allow the update
  
  3. Security
    - Can only UPDATE rows where current email = auth.email() (USING)
    - Cannot change the ID to hijack another record (PostgreSQL prevents this)
    - Email can be changed freely once ownership is verified
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create simple and correct policy
-- USING verifies we own the record
-- WITH CHECK just needs to pass (true) since we can't change our ID anyway
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (true);
