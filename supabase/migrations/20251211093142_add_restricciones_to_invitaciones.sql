/*
  # Add Dietary Restrictions to External Invitations

  1. Changes
    - Add `restricciones_ids` column to `invitaciones_comedor` table
      - Array of UUIDs referencing `restricciones_dieteticas` table
      - Nullable (not all external guests will have restrictions)
      - Only used for external guests (when nombre_completo is not null)

  2. Purpose
    - Allow administrators to assign dietary restrictions to external guests
    - Ensure kitchen staff has complete information in daily reports
    - Reuse existing dietary restrictions catalog

  3. Indexes
    - Add GIN index for efficient array searches on restricciones_ids
*/

-- Add restricciones_ids column to invitaciones_comedor
ALTER TABLE invitaciones_comedor
ADD COLUMN IF NOT EXISTS restricciones_ids uuid[] DEFAULT NULL;

-- Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_invitaciones_restricciones
ON invitaciones_comedor USING GIN (restricciones_ids);

-- Add comment to document the column usage
COMMENT ON COLUMN invitaciones_comedor.restricciones_ids IS
'Array of dietary restriction IDs for external guests. References restricciones_dieteticas table.';
