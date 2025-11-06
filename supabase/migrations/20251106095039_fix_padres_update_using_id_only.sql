/*
  # Fix padres UPDATE policy to use ID-based verification

  1. Root Cause
    - When a parent updates their email, auth.email() still returns the OLD email
    - The WITH CHECK clause was trying to verify using auth.email() which fails
    - We need to match based on auth.uid() to the user's auth ID instead

  2. Solution
    - Store the auth user ID in the padres table if not already present
    - Update the policy to match based on auth.uid() instead of email
    - This allows email changes without RLS conflicts

  3. Implementation
    - Add user_id column to padres table if it doesn't exist
    - Update policy to use auth.uid() for verification
*/

-- First, add user_id column if it doesn't exist (to link to auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'padres' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE padres ADD COLUMN user_id uuid REFERENCES auth.users(id);
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_padres_user_id ON padres(user_id);
  END IF;
END $$;

-- Update existing records to link email with auth user_id
UPDATE padres p
SET user_id = u.id
FROM auth.users u
WHERE p.email = u.email AND p.user_id IS NULL;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Padres can update own profile" ON padres;

-- Create new policy that uses user_id OR email for backward compatibility
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
