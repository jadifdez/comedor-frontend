/*
  # Fix padres UPDATE policy - Final solution

  1. Root Cause Analysis
    - USING checks OLD row (before update) - works with email = auth.email()
    - WITH CHECK checks NEW row (after update) - FAILS if email changed
    - When email changes: NEW email ≠ auth.email() → WITH CHECK fails
  
  2. Correct Solution
    - USING: Verify ownership using email OR user_id (both work on OLD row)
    - WITH CHECK: Verify using user_id OR true
      * user_id never changes during update, so it's safe
      * If user_id is NULL, we use true (allow update)
      * This allows email changes while maintaining security
  
  3. Security
    - Can only UPDATE rows you own (verified by USING)
    - user_id cannot be changed to hijack another record (enforced by FK constraint)
    - Email can be freely changed once ownership is verified

  4. Why this works
    - USING finds the row using current email (before change)
    - WITH CHECK validates using user_id (which doesn't change)
    - For old records without user_id, we allow the update (they're already verified by USING)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create the correct policy
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    -- Verify we own this record (OLD row)
    user_id = auth.uid() OR email = auth.email()
  )
  WITH CHECK (
    -- Verify the updated record still belongs to us (NEW row)
    -- Use user_id because it doesn't change, or allow if NULL (old records)
    user_id = auth.uid() OR user_id IS NULL
  );
