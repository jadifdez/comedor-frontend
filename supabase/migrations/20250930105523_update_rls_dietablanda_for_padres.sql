/*
  # Update RLS policies for comedor_dietablanda to support padres

  1. Changes
    - Drop existing RLS policy
    - Create new policy that allows both hijo_id and padre_id based access
    - Parents can manage illness reports for their children
    - Parents (personal) can manage their own illness reports

  2. Security
    - Authenticated users can only access/modify records for their own children or themselves
    - Admins have full access through separate policies
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Parents can manage illness reports for their children" ON comedor_dietablanda;

-- Create new policy that supports both children and personal (padres)
CREATE POLICY "Parents can manage diet records for children and themselves"
  ON comedor_dietablanda
  FOR ALL
  TO authenticated
  USING (
    -- For children: check if the child belongs to this parent
    (hijo_id IN (
      SELECT h.id
      FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    ))
    OR
    -- For personal (padres): check if this is their own record
    (padre_id IN (
      SELECT p.id
      FROM padres p
      WHERE p.email = auth.email()
    ))
  )
  WITH CHECK (
    -- Same check for inserts/updates
    (hijo_id IN (
      SELECT h.id
      FROM hijos h
      JOIN padres p ON h.padre_id = p.id
      WHERE p.email = auth.email()
    ))
    OR
    (padre_id IN (
      SELECT p.id
      FROM padres p
      WHERE p.email = auth.email()
    ))
  );