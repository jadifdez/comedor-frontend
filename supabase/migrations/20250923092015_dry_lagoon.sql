/*
  # Change enfermedades table structure

  1. Changes
    - Remove dias_dieta_blanda array column
    - Add single fecha_dieta_blanda date column
    - This allows one record per day instead of array of days

  2. Security
    - Maintain existing RLS policies
    - Keep all existing constraints and triggers
*/

-- Remove the array column and add single date column
ALTER TABLE enfermedades DROP COLUMN IF EXISTS dias_dieta_blanda;
ALTER TABLE enfermedades ADD COLUMN fecha_dieta_blanda date NOT NULL DEFAULT CURRENT_DATE;