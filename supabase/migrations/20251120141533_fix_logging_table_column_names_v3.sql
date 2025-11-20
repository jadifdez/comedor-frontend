/*
  # Fix logging table to match actual inscripciones_padres schema
  
  1. Changes
    - Rename fecha_desde to fecha_inicio
    - Rename fecha_hasta to fecha_fin
    - Recreate inscripcion_id as uuid column
    - Update trigger function to use correct column names
    - Drop and recreate helper function with correct return type
    
  2. Notes
    - The comedor_inscripciones_padres table uses fecha_inicio/fecha_fin, not fecha_desde/fecha_hasta
    - inscripcion_id should be uuid, not bigint
*/

-- Rename columns in logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comedor_inscripciones_padres_logs' 
    AND column_name = 'fecha_desde'
  ) THEN
    ALTER TABLE comedor_inscripciones_padres_logs 
      RENAME COLUMN fecha_desde TO fecha_inicio;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comedor_inscripciones_padres_logs' 
    AND column_name = 'fecha_hasta'
  ) THEN
    ALTER TABLE comedor_inscripciones_padres_logs 
      RENAME COLUMN fecha_hasta TO fecha_fin;
  END IF;
END $$;

-- Drop the old inscripcion_id column and create new one as uuid
ALTER TABLE comedor_inscripciones_padres_logs 
  DROP COLUMN inscripcion_id;

ALTER TABLE comedor_inscripciones_padres_logs 
  ADD COLUMN inscripcion_id uuid;

-- Update the trigger function with correct column names
CREATE OR REPLACE FUNCTION log_inscripcion_padres_operation()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_email text;
  v_user_id uuid;
  v_is_admin boolean;
  v_padre_id uuid;
  v_inscripcion_id uuid;
  v_fecha_inicio date;
  v_fecha_fin date;
  v_policy_matched text;
BEGIN
  -- Capture current user info
  v_user_email := auth.email();
  v_user_id := auth.uid();
  v_is_admin := is_admin();
  
  -- Determine which record to log (NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    v_padre_id := OLD.padre_id;
    v_inscripcion_id := OLD.id;
    v_fecha_inicio := OLD.fecha_inicio;
    v_fecha_fin := OLD.fecha_fin;
  ELSE
    v_padre_id := NEW.padre_id;
    v_inscripcion_id := NEW.id;
    v_fecha_inicio := NEW.fecha_inicio;
    v_fecha_fin := NEW.fecha_fin;
  END IF;
  
  -- Determine which policy would match
  IF v_is_admin THEN
    v_policy_matched := 'Admins can manage all inscripciones';
  ELSIF v_padre_id IN (SELECT id FROM padres WHERE email = v_user_email) THEN
    v_policy_matched := 'Parents can manage own inscripciones';
  ELSE
    v_policy_matched := 'NO_POLICY_MATCHED';
  END IF;
  
  -- Insert log entry
  INSERT INTO comedor_inscripciones_padres_logs (
    operation,
    user_email,
    user_id,
    is_admin_flag,
    padre_id,
    inscripcion_id,
    fecha_inicio,
    fecha_fin,
    policy_matched,
    success
  ) VALUES (
    TG_OP,
    v_user_email,
    v_user_id,
    v_is_admin,
    v_padre_id,
    v_inscripcion_id,
    v_fecha_inicio,
    v_fecha_fin,
    v_policy_matched,
    true
  );
  
  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop and recreate the helper function with correct return type
DROP FUNCTION IF EXISTS get_recent_inscripcion_logs(integer);

CREATE FUNCTION get_recent_inscripcion_logs(limit_count integer DEFAULT 100)
RETURNS TABLE (
  id bigint,
  operation text,
  user_email text,
  user_id uuid,
  is_admin_flag boolean,
  padre_id uuid,
  inscripcion_id uuid,
  fecha_inicio date,
  fecha_fin date,
  policy_matched text,
  success boolean,
  error_message text,
  created_at timestamptz
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    id,
    operation,
    user_email,
    user_id,
    is_admin_flag,
    padre_id,
    inscripcion_id,
    fecha_inicio,
    fecha_fin,
    policy_matched,
    success,
    error_message,
    created_at
  FROM comedor_inscripciones_padres_logs
  ORDER BY created_at DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_recent_inscripcion_logs TO authenticated;
