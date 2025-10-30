/*
  # Add padre_id support to comedor_dietablanda table

  1. Changes
    - Add `padre_id` column to `comedor_dietablanda` table (nullable, for personal del colegio)
    - Add foreign key constraint to `padres` table
    - Make `hijo_id` nullable since now either `hijo_id` OR `padre_id` will be set
    - Add check constraint to ensure one and only one of `hijo_id` or `padre_id` is set

  2. Security
    - Existing RLS policies will continue to work
*/

-- Make hijo_id nullable
ALTER TABLE comedor_dietablanda ALTER COLUMN hijo_id DROP NOT NULL;

-- Add padre_id column
ALTER TABLE comedor_dietablanda ADD COLUMN IF NOT EXISTS padre_id uuid REFERENCES padres(id);

-- Add check constraint to ensure one and only one is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_one_parent_type'
  ) THEN
    ALTER TABLE comedor_dietablanda ADD CONSTRAINT check_one_parent_type
      CHECK (
        (hijo_id IS NOT NULL AND padre_id IS NULL) OR
        (hijo_id IS NULL AND padre_id IS NOT NULL)
      );
  END IF;
END $$;