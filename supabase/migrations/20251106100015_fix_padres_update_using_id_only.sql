/*
  # Fix padres UPDATE policy - Use ID-based authentication

  1. Problem
    - Current policy uses email matching which is problematic during email changes
    - When user changes email, auth.email() still returns OLD email
    - We need a stable identifier that doesn't change
  
  2. Solution
    - Use user_id column (foreign key to auth.users.id)
    - Match against auth.uid() which is stable and never changes
    - Fallback to email matching for backwards compatibility (old records without user_id)
  
  3. Security
    - USING: Match either user_id = auth.uid() OR email = auth.email()
    - WITH CHECK: Same validation
    - This allows email changes while maintaining security through the stable user_id

  4. Implementation Note
    - Most padres records don't have user_id populated yet
    - Email fallback ensures they can still update until user_id is set
    - Frontend already attempts to set user_id on profile load
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create ID-based policy with email fallback
CREATE POLICY "Padres can update own profile"
  ON padres
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR email = auth.email()
  )
  WITH CHECK (
    user_id = auth.uid() OR email = auth.email()
  );
